import prisma from '../config/prisma';
import { Role, OrgStatus, Prisma } from '@prisma/client';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: true,
        employee: {
          include: {
            wallet: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        employee: {
          include: {
            wallet: true,
          },
        },
      },
    });
  }

  async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  async findByRole(role: Role, organizationId?: string) {
    return prisma.user.findMany({
      where: {
        role,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

export const userRepository = new UserRepository();
