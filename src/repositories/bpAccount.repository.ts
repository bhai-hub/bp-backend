import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class BPAccountRepository {
  async createAccount(organizationId: string) {
    return prisma.organizationBPAccount.create({
      data: {
        organizationId,
        purchasedBP: 0,
        allocatedBP: 0,
        availableBP: 0,
      },
    });
  }

  async findByOrgId(organizationId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organizationBPAccount.findUnique({
      where: { organizationId },
    });
  }

  async recordPurchase(
    organizationId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
  ) {
    return tx.organizationBPAccount.update({
      where: { organizationId },
      data: {
        purchasedBP: { increment: quantity },
        availableBP: { increment: quantity },
      },
    });
  }

  async recordAllocation(
    organizationId: string,
    amount: number,
    tx: Prisma.TransactionClient,
  ) {
    return tx.organizationBPAccount.update({
      where: { organizationId },
      data: {
        allocatedBP: { increment: amount },
        availableBP: { decrement: amount },
      },
    });
  }

  async getAggregateTotals() {
    return prisma.organizationBPAccount.aggregate({
      _sum: {
        purchasedBP: true,
        allocatedBP: true,
        availableBP: true,
      },
    });
  }
}

export const bpAccountRepository = new BPAccountRepository();
