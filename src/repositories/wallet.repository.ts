import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class WalletRepository {
  async findByEmployeeId(employeeId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.employeeWallet.findUnique({
      where: { employeeId },
    });
  }

  async creditSpendableAndLifetime(
    employeeId: string,
    amount: number,
    tx: Prisma.TransactionClient,
  ) {
    return tx.employeeWallet.update({
      where: { employeeId },
      data: {
        spendableBalance: { increment: amount },
        lifetimeBalance: { increment: amount },
      },
    });
  }
}

export const walletRepository = new WalletRepository();
