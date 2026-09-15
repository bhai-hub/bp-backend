import prisma from '../config/prisma';
import { employeeRepository } from '../repositories/employee.repository';
import { userRepository } from '../repositories/user.repository';
import { bpAccountRepository } from '../repositories/bpAccount.repository';
import { bpTransactionRepository } from '../repositories/bpTransaction.repository';
import { walletRepository } from '../repositories/wallet.repository';
import { auditRepository } from '../repositories/audit.repository';
import { hashPassword } from '../utils/password';
import { hashToken, generateRawToken } from '../utils/token';
import { AppError } from '../middleware/errorHandler';
import { EmployeeStatus, OnboardingStatus } from '@prisma/client';

export class EmployeeService {
  async createEmployee(
    hrUser: { organizationId: string | null; userId: string },
    data: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      employeeCode: string;
      department: string;
      designation: string;
      joiningDate?: string;
    },
  ) {
    if (!hrUser.organizationId) {
      throw new AppError('HR Manager must belong to an organization', 400);
    }

    const orgId = hrUser.organizationId;

    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('A user with this email already exists', 409);
    }

    const passwordHash = await hashPassword(data.password || 'Welcome@123');
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: 'EMPLOYEE',
          firstName: data.firstName,
          lastName: data.lastName,
          organizationId: orgId,
          status: 'ACTIVE',
        },
      });

      // 2. Create Employee profile in INVITED state with initialized Wallet
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          employeeCode: data.employeeCode,
          department: data.department,
          designation: data.designation,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          status: 'ACTIVE',
          onboardingStatus: OnboardingStatus.INVITED,
          invitationTokenHash: tokenHash,
          invitationExpiresAt: expiresAt,
          wallet: {
            create: {
              spendableBalance: 0,
              loyaltyBalance: 0,
              lifetimeBalance: 0,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          wallet: true,
          organization: true,
        },
      });

      // 3. Audit log
      await auditRepository.log(
        {
          action: 'EMPLOYEE_CREATED',
          organizationId: orgId,
          userId: hrUser.userId,
          details: { employeeId: employee.id, employeeCode: data.employeeCode },
        },
        tx,
      );

      await auditRepository.log(
        {
          action: 'INVITATION_SENT',
          organizationId: orgId,
          userId: hrUser.userId,
          details: { employeeId: employee.id, email: data.email, expiresAt },
        },
        tx,
      );

      return {
        ...employee,
        invitationToken: rawToken,
        invitationExpiresAt: expiresAt,
      };
    });
  }

  async getEmployeesByOrg(organizationId: string) {
    return employeeRepository.findByOrg(organizationId);
  }

  async updateEmployeeStatus(
    hrUser: { organizationId: string | null; userId: string },
    employeeId: string,
    status: EmployeeStatus,
  ) {
    if (!hrUser.organizationId) {
      throw new AppError('HR Manager must belong to an organization', 400);
    }

    // Strict organization isolation check
    const employee = await employeeRepository.findById(employeeId, hrUser.organizationId);
    if (!employee) {
      throw new AppError('Employee not found in your organization', 404);
    }

    const updated = await employeeRepository.updateStatus(employeeId, status);

    await auditRepository.log({
      action: 'EMPLOYEE_STATUS_UPDATED',
      organizationId: hrUser.organizationId,
      userId: hrUser.userId,
      details: { employeeId, previousStatus: employee.status, newStatus: status },
    });

    return updated;
  }

  async creditBP(
    hrUser: { organizationId: string | null; userId: string },
    employeeId: string,
    amount: number,
    reason: string,
    ipAddress?: string,
  ) {
    // 1. HR must belong to an organization
    if (!hrUser.organizationId) {
      throw new AppError('HR Manager must be assigned to an organization', 403);
    }

    // 2. Amount must be positive
    if (amount <= 0) {
      throw new AppError('Credit amount must be greater than zero', 400);
    }

    // 3. Employee must exist and belong to the same organization (Tenant Isolation)
    const employee = await employeeRepository.findById(employeeId, hrUser.organizationId);
    if (!employee) {
      throw new AppError('Employee not found or does not belong to your organization', 404);
    }

    // 4. Employee must be ACTIVE
    if (employee.status !== 'ACTIVE') {
      throw new AppError('Cannot credit Brownie Points to an inactive employee', 400);
    }

    // 5. Organization must have enough available BP
    const bpAccount = await bpAccountRepository.findByOrgId(hrUser.organizationId);
    if (!bpAccount || bpAccount.availableBP < amount) {
      throw new AppError(
        `Insufficient organization Brownie Points. Available: ${bpAccount?.availableBP || 0}, requested: ${amount}`,
        400,
      );
    }

    // Execute atomic balance transfer & ledger transaction
    return prisma.$transaction(async (tx) => {
      // Step 8: Create BP transaction (type ALLOCATION)
      const reference = `CREDIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const transaction = await bpTransactionRepository.create(
        {
          organizationId: hrUser.organizationId!,
          employeeId: employee.id,
          type: 'ALLOCATION',
          amount,
          reference,
          description: reason,
          createdByUserId: hrUser.userId,
        },
        tx,
      );

      // Step 9: Decrease organization available BP, increase allocated BP
      const updatedAccount = await bpAccountRepository.recordAllocation(
        hrUser.organizationId!,
        amount,
        tx,
      );

      // Step 10 & 11: Increase employee spendable balance & lifetime balance
      const updatedWallet = await walletRepository.creditSpendableAndLifetime(
        employee.id,
        amount,
        tx,
      );

      // Step 12: Create audit information
      await auditRepository.log(
        {
          action: 'BP_CREDITED_TO_EMPLOYEE',
          organizationId: hrUser.organizationId,
          userId: hrUser.userId,
          details: {
            employeeId: employee.id,
            employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
            amount,
            reason,
            reference,
            newSpendableBalance: updatedWallet.spendableBalance,
            newOrgAvailableBP: updatedAccount.availableBP,
          },
          ipAddress,
        },
        tx,
      );

      return {
        transaction,
        wallet: updatedWallet,
        organizationBP: {
          availableBP: updatedAccount.availableBP,
          allocatedBP: updatedAccount.allocatedBP,
        },
      };
    });
  }

  async getEmployeeMe(userId: string) {
    const employee = await employeeRepository.findByUserId(userId);
    if (!employee) {
      throw new AppError('Employee profile not found for this user', 404);
    }

    const recentActivity = await bpTransactionRepository.findByEmployee(employee.id, 20);

    return {
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        status: employee.status,
        user: {
          id: employee.user.id,
          email: employee.user.email,
          firstName: employee.user.firstName,
          lastName: employee.user.lastName,
        },
        organization: {
          id: employee.organization.id,
          name: employee.organization.name,
          currency: employee.organization.currency,
        },
      },
      wallet: employee.wallet,
      recentActivity,
    };
  }

  async updateEmployeeMe(userId: string, data: { firstName?: string; lastName?: string }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await userRepository.updateUser(userId, {
      ...(data.firstName ? { firstName: data.firstName } : {}),
      ...(data.lastName ? { lastName: data.lastName } : {}),
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
    };
  }

  async getEmployeeActivity(userId: string) {
    const employee = await employeeRepository.findByUserId(userId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    return bpTransactionRepository.findByEmployee(employee.id, 50);
  }
}

export const employeeService = new EmployeeService();
