import prisma from '../config/prisma';
import { Prisma, TransactionType } from '@prisma/client';

export interface CreateBPTransactionDTO {
  organizationId: string;
  employeeId?: string | null;
  type: TransactionType;
  amount: number;
  reference: string;
  description: string;
  createdByUserId?: string | null;
}

export class BPTransactionRepository {
  async create(data: CreateBPTransactionDTO, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.bPTransaction.create({
      data: {
        organizationId: data.organizationId,
        employeeId: data.employeeId,
        type: data.type,
        amount: data.amount,
        reference: data.reference,
        description: data.description,
        createdByUserId: data.createdByUserId,
      },
    });
  }

  async findByOrganization(organizationId: string, limit = 50) {
    return prisma.bPTransaction.findMany({
      where: { organizationId },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByEmployee(employeeId: string, limit = 50) {
    return prisma.bPTransaction.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const bpTransactionRepository = new BPTransactionRepository();
