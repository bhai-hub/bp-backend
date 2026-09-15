import prisma from '../config/prisma';
import { userRepository } from '../repositories/user.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { employeeRepository } from '../repositories/employee.repository';
import { bpAccountRepository } from '../repositories/bpAccount.repository';
import { bpTransactionRepository } from '../repositories/bpTransaction.repository';
import { auditRepository } from '../repositories/audit.repository';
import { hashPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';

export class HrService {
  async createHrManager(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId: string;
  }, adminUserId?: string) {
    const org = await organizationRepository.findById(data.organizationId);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await userRepository.createUser({
      email: data.email,
      passwordHash,
      role: 'HR_MANAGER',
      firstName: data.firstName,
      lastName: data.lastName,
      organization: {
        connect: { id: data.organizationId },
      },
    });

    await auditRepository.log({
      action: 'HR_MANAGER_CREATED',
      organizationId: data.organizationId,
      userId: adminUserId,
      details: { hrUserId: user.id, email: user.email },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
    };
  }

  async getHrManagers(organizationId?: string) {
    return userRepository.findByRole('HR_MANAGER', organizationId);
  }

  async getAdminDashboardMetrics() {
    const [
      totalOrgs,
      activeOrgs,
      totalEmployees,
      totalHrManagers,
      bpTotals,
      recentOrgs,
      recentAudits,
    ] = await Promise.all([
      organizationRepository.count(),
      organizationRepository.count('ACTIVE'),
      employeeRepository.count(),
      userRepository.findByRole('HR_MANAGER').then((list) => list.length),
      bpAccountRepository.getAggregateTotals(),
      organizationRepository.findAll(),
      auditRepository.findRecent(10),
    ]);

    return {
      metrics: {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        totalHrManagers,
        totalEmployees,
        totalBPPurchased: bpTotals._sum.purchasedBP || 0,
        totalBPAllocated: bpTotals._sum.allocatedBP || 0,
        totalBPAvailable: bpTotals._sum.availableBP || 0,
      },
      recentOrganizations: recentOrgs.slice(0, 5),
      recentActivity: recentAudits,
    };
  }

  async getHrDashboardMetrics(organizationId: string) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const [totalEmployees, activeEmployees, recentActivity] = await Promise.all([
      employeeRepository.count(organizationId),
      employeeRepository.count(organizationId, 'ACTIVE'),
      bpTransactionRepository.findByOrganization(organizationId, 10),
    ]);

    return {
      organization: {
        id: org.id,
        name: org.name,
        legalName: org.legalName,
        slug: org.slug,
        currency: org.currency,
        status: org.status,
        bpPolicy: org.bpPolicy,
      },
      metrics: {
        totalEmployees,
        activeEmployees,
        bpAvailable: org.bpAccount?.availableBP || 0,
        bpAllocated: org.bpAccount?.allocatedBP || 0,
        bpPurchased: org.bpAccount?.purchasedBP || 0,
      },
      recentActivity,
    };
  }
}

export const hrService = new HrService();
