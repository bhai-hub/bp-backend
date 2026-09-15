import prisma from '../config/prisma';
import { bpAccountRepository } from '../repositories/bpAccount.repository';
import { bpTransactionRepository } from '../repositories/bpTransaction.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';

export class BPService {
  async purchaseBP(
    organizationId: string,
    quantity: number,
    reference: string,
    description = 'Simulated Brownie Points Purchase',
    adminUserId?: string,
  ) {
    if (quantity <= 0) {
      throw new AppError('Purchase quantity must be greater than zero', 400);
    }

    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    if (org.status !== 'ACTIVE') {
      throw new AppError('Cannot purchase Brownie Points for an inactive organization', 400);
    }

    return prisma.$transaction(async (tx) => {
      // 1. Increment purchased and available BP
      const updatedAccount = await bpAccountRepository.recordPurchase(
        organizationId,
        quantity,
        tx,
      );

      // 2. Create ledger transaction
      const transaction = await bpTransactionRepository.create(
        {
          organizationId,
          type: 'PURCHASE',
          amount: quantity,
          reference,
          description,
          createdByUserId: adminUserId,
        },
        tx,
      );

      // 3. Create audit record
      await auditRepository.log(
        {
          action: 'BP_PURCHASED',
          organizationId,
          userId: adminUserId,
          details: {
            quantity,
            reference,
            newPurchasedBP: updatedAccount.purchasedBP,
            newAvailableBP: updatedAccount.availableBP,
          },
        },
        tx,
      );

      return {
        account: updatedAccount,
        transaction,
      };
    });
  }

  async getAccountAndTransactions(organizationId: string) {
    const account = await bpAccountRepository.findByOrgId(organizationId);
    if (!account) {
      throw new AppError('Organization BP account not found', 404);
    }

    const transactions = await bpTransactionRepository.findByOrganization(organizationId, 50);

    return {
      account,
      transactions,
    };
  }
}

export const bpService = new BPService();
