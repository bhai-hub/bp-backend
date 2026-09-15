import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class AuditRepository {
  async log(data: {
    action: string;
    organizationId?: string | null;
    userId?: string | null;
    details?: any;
    ipAddress?: string | null;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.auditLog.create({
      data: {
        action: data.action,
        organizationId: data.organizationId,
        userId: data.userId,
        details: data.details,
        ipAddress: data.ipAddress,
      },
    });
  }

  async findRecent(limit = 20) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });
  }
}

export const auditRepository = new AuditRepository();
