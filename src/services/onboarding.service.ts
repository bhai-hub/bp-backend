import prisma from '../config/prisma';
import { employeeRepository } from '../repositories/employee.repository';
import { userRepository } from '../repositories/user.repository';
import { auditRepository } from '../repositories/audit.repository';
import { hashToken, generateRawToken } from '../utils/token';
import { hashPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { OnboardingStatus } from '@prisma/client';

export class OnboardingService {
  /**
   * Validates an invitation token and returns safe public metadata for the onboarding welcome screen.
   */
  async validateInvitation(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new AppError('Invitation token is required', 400);
    }

    const tokenHash = hashToken(rawToken);
    const employee = await employeeRepository.findByInvitationTokenHash(tokenHash);

    if (!employee) {
      throw new AppError('Invalid or unrecognised invitation link', 404);
    }

    if (employee.onboardingStatus !== OnboardingStatus.INVITED) {
      throw new AppError('This invitation has already been accepted or consumed', 400);
    }

    if (employee.invitationExpiresAt && employee.invitationExpiresAt < new Date()) {
      throw new AppError(
        'This invitation link has expired. Please ask your HR manager to resend your invitation.',
        410,
      );
    }

    return {
      email: employee.user.email,
      firstName: employee.user.firstName,
      lastName: employee.user.lastName,
      department: employee.department,
      designation: employee.designation,
      organizationName: employee.organization.name,
      countryCode: employee.organization.countryCode,
      countryName: employee.organization.countryName,
    };
  }

  /**
   * Accepts an invitation, sets initial employee password, consumes the token,
   * advances status to PROFILE_PENDING, and returns an authenticated JWT session.
   */
  async acceptInvitation(rawToken: string, password: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new AppError('Invitation token is required', 400);
    }

    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    const tokenHash = hashToken(rawToken);
    const employee = await employeeRepository.findByInvitationTokenHash(tokenHash);

    if (!employee) {
      throw new AppError('Invalid or unrecognised invitation link', 404);
    }

    if (employee.onboardingStatus !== OnboardingStatus.INVITED) {
      throw new AppError('This invitation has already been accepted or consumed', 400);
    }

    if (employee.invitationExpiresAt && employee.invitationExpiresAt < new Date()) {
      throw new AppError('This invitation link has expired. Please request a new invitation.', 410);
    }

    const passwordHash = await hashPassword(password);

    return prisma.$transaction(async (tx) => {
      // 1. Update user password and activate
      const updatedUser = await tx.user.update({
        where: { id: employee.userId },
        data: {
          passwordHash,
          status: 'ACTIVE',
        },
      });

      // 2. Clear invitation token and advance onboarding state
      const updatedEmployee = await tx.employee.update({
        where: { id: employee.id },
        data: {
          onboardingStatus: OnboardingStatus.PROFILE_PENDING,
          invitationTokenHash: null,
          invitationExpiresAt: null,
        },
        include: {
          organization: true,
          wallet: true,
        },
      });

      // 3. Log audit event
      await auditRepository.log(
        {
          action: 'INVITATION_ACCEPTED',
          organizationId: employee.organizationId,
          userId: employee.userId,
          details: {
            employeeId: employee.id,
            email: employee.user.email,
          },
        },
        tx,
      );

      // 4. Generate JWT session token for seamless onboarding progression
      const token = generateToken({
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        employeeId: updatedEmployee.id,
      });

      return {
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          organizationId: updatedUser.organizationId,
          organization: updatedEmployee.organization,
          employee: {
            id: updatedEmployee.id,
            employeeCode: updatedEmployee.employeeCode,
            department: updatedEmployee.department,
            designation: updatedEmployee.designation,
            onboardingStatus: updatedEmployee.onboardingStatus,
            wallet: updatedEmployee.wallet,
          },
        },
        onboardingStatus: OnboardingStatus.PROFILE_PENDING,
      };
    });
  }

  /**
   * Completes the profile stage of onboarding and advances employee to IKIGAI_PENDING.
   */
  async completeProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      department?: string;
      designation?: string;
    },
  ) {
    const user = await userRepository.findById(userId);
    if (!user || !user.employee) {
      throw new AppError('Employee record not found', 404);
    }

    const employee = user.employee;

    // Allowed transition checks
    if (
      employee.onboardingStatus !== OnboardingStatus.PROFILE_PENDING &&
      employee.onboardingStatus !== OnboardingStatus.ACCOUNT_CREATED &&
      employee.onboardingStatus !== OnboardingStatus.INVITED
    ) {
      // If already completed or further, return existing state
      return {
        employee,
        onboardingStatus: employee.onboardingStatus,
      };
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update User basic info
      if (data.firstName || data.lastName) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(data.firstName ? { firstName: data.firstName } : {}),
            ...(data.lastName ? { lastName: data.lastName } : {}),
          },
        });
      }

      // 2. Update Employee profile details and transition to IKIGAI_PENDING
      const updatedEmployee = await tx.employee.update({
        where: { id: employee.id },
        data: {
          ...(data.department ? { department: data.department } : {}),
          ...(data.designation ? { designation: data.designation } : {}),
          onboardingStatus: OnboardingStatus.IKIGAI_PENDING,
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
          organization: true,
          wallet: true,
        },
      });

      // 3. Log audit event
      await auditRepository.log(
        {
          action: 'PROFILE_COMPLETED',
          organizationId: employee.organizationId,
          userId,
          details: {
            employeeId: employee.id,
            department: updatedEmployee.department,
            designation: updatedEmployee.designation,
          },
        },
        tx,
      );

      return {
        employee: updatedEmployee,
        onboardingStatus: OnboardingStatus.IKIGAI_PENDING,
      };
    });
  }

  /**
   * Resends an onboarding invitation to an employee.
   * Invalidates old tokens and generates a fresh token with expiration.
   */
  async resendInvitation(
    hrUser: { userId: string; organizationId: string | null },
    employeeId: string,
  ) {
    if (!hrUser.organizationId) {
      throw new AppError('HR Manager must belong to an organization', 400);
    }

    const employee = await employeeRepository.findById(employeeId, hrUser.organizationId);
    if (!employee) {
      throw new AppError('Employee not found or belongs to another organization', 404);
    }

    if (employee.onboardingStatus === OnboardingStatus.COMPLETED) {
      throw new AppError('Employee has already completed onboarding', 400);
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await employeeRepository.saveInvitation(employee.id, tokenHash, expiresAt);

    await auditRepository.log({
      action: 'INVITATION_RESENT',
      organizationId: hrUser.organizationId,
      userId: hrUser.userId,
      details: {
        employeeId: employee.id,
        email: employee.user.email,
        expiresAt,
      },
    });

    return {
      employeeId: employee.id,
      email: employee.user.email,
      invitationToken: rawToken,
      expiresAt,
    };
  }

  /**
   * Returns onboarding status for an authenticated employee.
   */
  async getOnboardingStatus(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || !user.employee) {
      throw new AppError('Employee record not found', 404);
    }

    return {
      employeeId: user.employee.id,
      onboardingStatus: user.employee.onboardingStatus,
      onboardingCompletedAt: user.employee.onboardingCompletedAt,
    };
  }
}

export const onboardingService = new OnboardingService();
export default onboardingService;
