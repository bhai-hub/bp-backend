import prisma from '../config/prisma';
import { EmployeeStatus, OnboardingStatus, Prisma } from '@prisma/client';

export class EmployeeRepository {
  async findById(id: string, organizationId?: string) {
    return prisma.employee.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        user: true,
        wallet: true,
        organization: true,
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.employee.findUnique({
      where: { userId },
      include: {
        user: true,
        wallet: true,
        organization: true,
      },
    });
  }

  async findByInvitationTokenHash(invitationTokenHash: string) {
    return prisma.employee.findUnique({
      where: { invitationTokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            role: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
    });
  }

  async findByOrg(organizationId: string) {
    return prisma.employee.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        wallet: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEmployeeWithWallet(
    data: {
      userId: string;
      organizationId: string;
      employeeCode: string;
      department: string;
      designation: string;
      joiningDate?: Date;
      onboardingStatus?: OnboardingStatus;
      invitationTokenHash?: string;
      invitationExpiresAt?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return client.employee.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        employeeCode: data.employeeCode,
        department: data.department,
        designation: data.designation,
        joiningDate: data.joiningDate || new Date(),
        onboardingStatus: data.onboardingStatus || OnboardingStatus.COMPLETED,
        invitationTokenHash: data.invitationTokenHash,
        invitationExpiresAt: data.invitationExpiresAt,
        wallet: {
          create: {
            spendableBalance: 0,
            loyaltyBalance: 0,
            lifetimeBalance: 0,
          },
        },
      },
      include: {
        user: true,
        wallet: true,
        organization: true,
      },
    });
  }

  async updateOnboardingStatus(
    id: string,
    onboardingStatus: OnboardingStatus,
    extra?: {
      invitationTokenHash?: string | null;
      invitationExpiresAt?: Date | null;
      onboardingCompletedAt?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return client.employee.update({
      where: { id },
      data: {
        onboardingStatus,
        ...extra,
      },
      include: {
        user: true,
        organization: true,
      },
    });
  }

  async saveInvitation(
    id: string,
    invitationTokenHash: string,
    invitationExpiresAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return client.employee.update({
      where: { id },
      data: {
        onboardingStatus: OnboardingStatus.INVITED,
        invitationTokenHash,
        invitationExpiresAt,
      },
      include: {
        user: true,
        organization: true,
      },
    });
  }

  async updateStatus(id: string, status: EmployeeStatus) {
    return prisma.employee.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        wallet: true,
      },
    });
  }

  async count(organizationId?: string, status?: EmployeeStatus) {
    return prisma.employee.count({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(status ? { status } : {}),
      },
    });
  }
}

export const employeeRepository = new EmployeeRepository();
export default employeeRepository;
