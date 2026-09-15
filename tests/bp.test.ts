import request from 'supertest';
import createApp from '../src/app';
import prisma from '../src/config/prisma';

const app = createApp();

describe('Brownie Points Ledger & Wallet Business Logic Tests', () => {
  let superAdminToken: string;
  let acmeHrToken: string;
  let acmeOrgId: string;
  let testEmployeeId: string;

  beforeAll(async () => {
    // 1. Super Admin login
    const saRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@browniepoints.com',
      password: 'Admin@123456',
    });
    superAdminToken = saRes.body.data.token;

    // 2. Acme HR login
    const hrRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hr@acme.com',
      password: 'Hr@123456',
    });
    acmeHrToken = hrRes.body.data.token;
    acmeOrgId = hrRes.body.data.user.organizationId;

    // 3. Create a dedicated test employee in Acme
    const empRes = await request(app)
      .post('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${acmeHrToken}`)
      .send({
        email: `test.worker.${Date.now()}@acme.com`,
        firstName: 'Test',
        lastName: 'Worker',
        employeeCode: `TW-${Date.now().toString().slice(-4)}`,
        department: 'Operations',
        designation: 'Specialist',
      });

    testEmployeeId = empRes.body.data.id;
  });

  describe('BP Purchases (Super Admin)', () => {
    it('BP purchase increases company purchased BP and available BP, creating ledger transaction', async () => {
      // Get current BP account
      const beforeRes = await request(app)
        .get(`/api/v1/admin/organizations/${acmeOrgId}/bp-account`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const initialPurchased = beforeRes.body.data.account.purchasedBP;
      const initialAvailable = beforeRes.body.data.account.availableBP;

      const purchaseQuantity = 50000;
      const refCode = `TEST-PURCHASE-${Date.now()}`;

      const purchaseRes = await request(app)
        .post(`/api/v1/admin/organizations/${acmeOrgId}/bp-purchases`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          quantity: purchaseQuantity,
          reference: refCode,
          description: 'Automated test bulk BP purchase',
        });

      expect(purchaseRes.status).toBe(201);
      expect(purchaseRes.body.success).toBe(true);
      expect(purchaseRes.body.data.account.purchasedBP).toBe(initialPurchased + purchaseQuantity);
      expect(purchaseRes.body.data.account.availableBP).toBe(initialAvailable + purchaseQuantity);
      expect(purchaseRes.body.data.transaction.type).toBe('PURCHASE');
      expect(purchaseRes.body.data.transaction.reference).toBe(refCode);

      // Verify transaction in DB ledger
      const txInDb = await prisma.bPTransaction.findFirst({
        where: { reference: refCode },
      });
      expect(txInDb).not.toBeNull();
      expect(txInDb?.amount).toBe(purchaseQuantity);
    });

    it('should reject purchase with non-positive quantity', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/organizations/${acmeOrgId}/bp-purchases`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          quantity: -100,
          reference: 'BAD-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('BP Credits to Employees (HR Manager)', () => {
    it('employee BP credit decreases company available BP and increases employee spendable & lifetime balances', async () => {
      // Current balances
      const accountBefore = await prisma.organizationBPAccount.findUnique({
        where: { organizationId: acmeOrgId },
      });
      const walletBefore = await prisma.employeeWallet.findUnique({
        where: { employeeId: testEmployeeId },
      });

      const initialOrgAvailable = accountBefore!.availableBP;
      const initialEmpSpendable = walletBefore!.spendableBalance;
      const initialEmpLifetime = walletBefore!.lifetimeBalance;

      const creditAmount = 2500;

      const creditRes = await request(app)
        .post(`/api/v1/hr/employees/${testEmployeeId}/bp-credit`)
        .set('Authorization', `Bearer ${acmeHrToken}`)
        .send({
          amount: creditAmount,
          reason: 'Exceptional test milestone achievement',
        });

      expect(creditRes.status).toBe(200);
      expect(creditRes.body.success).toBe(true);

      // Verify returned balances
      expect(creditRes.body.data.wallet.spendableBalance).toBe(initialEmpSpendable + creditAmount);
      expect(creditRes.body.data.wallet.lifetimeBalance).toBe(initialEmpLifetime + creditAmount);
      expect(creditRes.body.data.organizationBP.availableBP).toBe(initialOrgAvailable - creditAmount);

      // Verify ledger transaction was generated
      expect(creditRes.body.data.transaction.type).toBe('ALLOCATION');
      expect(creditRes.body.data.transaction.amount).toBe(creditAmount);

      // Verify DB persistence
      const walletInDb = await prisma.employeeWallet.findUnique({
        where: { employeeId: testEmployeeId },
      });
      expect(walletInDb?.spendableBalance).toBe(initialEmpSpendable + creditAmount);
      expect(walletInDb?.lifetimeBalance).toBe(initialEmpLifetime + creditAmount);
    });

    it('cannot credit more BP than available in organization account', async () => {
      const account = await prisma.organizationBPAccount.findUnique({
        where: { organizationId: acmeOrgId },
      });
      const excessiveAmount = account!.availableBP + 10000000;

      const res = await request(app)
        .post(`/api/v1/hr/employees/${testEmployeeId}/bp-credit`)
        .set('Authorization', `Bearer ${acmeHrToken}`)
        .send({
          amount: excessiveAmount,
          reason: 'Excessive credit attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/insufficient organization brownie points/i);
    });

    it('cannot credit an inactive employee', async () => {
      // Deactivate employee first
      await request(app)
        .patch(`/api/v1/hr/employees/${testEmployeeId}/status`)
        .set('Authorization', `Bearer ${acmeHrToken}`)
        .send({ status: 'INACTIVE' });

      // Attempt credit
      const res = await request(app)
        .post(`/api/v1/hr/employees/${testEmployeeId}/bp-credit`)
        .set('Authorization', `Bearer ${acmeHrToken}`)
        .send({
          amount: 500,
          reason: 'Inactive employee credit attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot credit brownie points to an inactive employee/i);

      // Re-activate employee
      await request(app)
        .patch(`/api/v1/hr/employees/${testEmployeeId}/status`)
        .set('Authorization', `Bearer ${acmeHrToken}`)
        .send({ status: 'ACTIVE' });
    });
  });
});
