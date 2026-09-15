import request from 'supertest';
import createApp from '../src/app';
import prisma from '../src/config/prisma';

const app = createApp();

describe('Country-Based Jurisdiction Policy Foundation Tests', () => {
  let superAdminToken: string;
  let hrToken: string;
  let employeeToken: string;
  let usOrgId: string;
  let chinaOrgId: string;

  beforeAll(async () => {
    // 1. Super Admin login
    const saRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@browniepoints.com',
      password: 'Admin@123456',
    });
    superAdminToken = saRes.body.data.token;

    // 2. HR Manager login
    const hrRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hr@acme.com',
      password: 'Hr@123456',
    });
    hrToken = hrRes.body.data.token;
    usOrgId = hrRes.body.data.user.organizationId;

    // 3. Employee login
    const empRes = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.miller@acme.com',
      password: 'Employee@123',
    });
    employeeToken = empRes.body.data.token;

    // 4. Create a test organization with China jurisdiction to test restrictive policy profile
    const cnOrgRes = await request(app)
      .post('/api/v1/admin/organizations')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'China Branch Corp',
        legalName: 'China Branch Corp Ltd',
        slug: `cn-branch-${Date.now()}`,
        email: `contact.${Date.now()}@chinabranch.com`,
        phone: '+86 10 1234 5678',
        countryCode: 'CN',
        currency: 'CNY',
      });
    chinaOrgId = cnOrgRes.body.data.id;

    // 5. Create an inactive country for testing validation
    await prisma.country.upsert({
      where: { code: 'XX' },
      update: { isActive: false },
      create: { code: 'XX', name: 'Inactive Territory', isActive: false },
    });

    // 6. Ensure DE policy has humanReviewRequired set to true before tests
    await prisma.jurisdictionPolicy.updateMany({
      where: { countryCode: 'DE' },
      data: { humanReviewRequired: true },
    });
  });

  describe('Country Reference & Validation', () => {
    it('GET /api/v1/countries returns list of active standard reference countries', async () => {
      const res = await request(app).get('/api/v1/countries');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const codes = res.body.data.map((c: any) => c.code);
      expect(codes).toContain('IN');
      expect(codes).toContain('US');
      expect(codes).toContain('DE');
      expect(codes).toContain('CN');
      expect(codes).not.toContain('XX'); // Inactive country excluded
    });

    it('valid country is accepted on organization creation', async () => {
      const res = await request(app)
        .post('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'India Regional Hub',
          legalName: 'India Regional Hub Pvt Ltd',
          slug: `in-regional-${Date.now()}`,
          email: `info.${Date.now()}@inregional.com`,
          phone: '+91 22 1234 5678',
          countryCode: 'IN',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.countryCode).toBe('IN');
      expect(res.body.data.countryName).toBe('India');
      expect(res.body.data.jurisdictionPolicyVersion).toBe(1);
    });

    it('rejects organization creation when country is missing', async () => {
      const res = await request(app)
        .post('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'No Country Org',
          legalName: 'No Country Org Inc',
          email: 'admin@nocountry.com',
          phone: '+1 555 0000',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects organization creation with invalid / unknown country code', async () => {
      const res = await request(app)
        .post('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Invalid Country Org',
          legalName: 'Invalid Country Org Inc',
          email: 'admin@invalidcountry.com',
          phone: '+1 555 0000',
          countryCode: 'ZZ', // Non-existent code
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid country code/i);
    });

    it('rejects organization creation with inactive country', async () => {
      const res = await request(app)
        .post('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Inactive Territory Org',
          legalName: 'Inactive Territory Org Inc',
          email: 'admin@inactiveterritory.com',
          phone: '+1 555 0000',
          countryCode: 'XX', // Inactive code
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/inactive for new organizations/i);
    });
  });

  describe('Jurisdiction Policy Profiles & Resolution', () => {
    it('resolves India policy profile with consent-led controls and India storage option', async () => {
      const res = await request(app)
        .get('/api/v1/admin/policies/IN')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.countryCode).toBe('IN');
      expect(res.body.data.consentRequired).toBe(true);
      expect(res.body.data.dataLocationPolicy).toBe('IN_COUNTRY_OPTION');
      expect(res.body.data.nonCashRedemptionOnly).toBe(true);
      expect(res.body.data.retentionPolicy).toBe('CONFIGURABLE');
    });

    it('resolves US policy profile with compensation separation and non-cash default', async () => {
      const res = await request(app)
        .get('/api/v1/admin/policies/US')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.countryCode).toBe('US');
      expect(res.body.data.automatedDecisionEnabled).toBe(false);
      expect(res.body.data.nonCashRedemptionOnly).toBe(true);
      expect(res.body.data.leaderboardEnabled).toBe(true);
    });

    it('resolves Germany policy profile with works-council considerations (leaderboard disabled)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/policies/DE')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.countryCode).toBe('DE');
      expect(res.body.data.leaderboardEnabled).toBe(false);
      expect(res.body.data.dataLocationPolicy).toBe('EU_ONLY');
      expect(res.body.data.humanReviewRequired).toBe(true);
    });

    it('resolves China policy profile with anti-social-scoring safeguards (leaderboards and public profiles disabled)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/policies/CN')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.countryCode).toBe('CN');
      expect(res.body.data.leaderboardEnabled).toBe(false);
      expect(res.body.data.publicProfileEnabled).toBe(false);
      expect(res.body.data.portabilityEnabled).toBe(false);
      expect(res.body.data.dataLocationPolicy).toBe('LOCAL_ONLY');
    });

    it('resolves unconfigured jurisdiction with controlled DEFAULT_REVIEW_REQUIRED fallback', async () => {
      // Temporarily create active country 'IS' (Iceland) without a pre-existing policy
      await prisma.country.upsert({
        where: { code: 'IS' },
        update: { isActive: true },
        create: { code: 'IS', name: 'Iceland', isActive: true },
      });

      const res = await request(app)
        .get('/api/v1/admin/policies/IS')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DEFAULT_REVIEW_REQUIRED');
      expect(res.body.data.leaderboardEnabled).toBe(false);
      expect(res.body.data.humanReviewRequired).toBe(true);
      expect(res.body.data.description).toMatch(/requires review/i);
    });
  });

  describe('Feature Guards & Enforcement', () => {
    it('allows access to feature when enabled under organization jurisdiction policy (US Leaderboard)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${usOrgId}/leaderboard`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects access to feature when disabled by jurisdiction policy (China Leaderboard -> 403 FEATURE_DISABLED_BY_JURISDICTION)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${chinaOrgId}/leaderboard`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FEATURE_DISABLED_BY_JURISDICTION');
      expect(res.body.message).toMatch(/disabled by the configured jurisdiction policy for CN/i);
    });

    it('rejects access to public profiles for China organization', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${chinaOrgId}/public-profiles`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FEATURE_DISABLED_BY_JURISDICTION');
    });

    it('rejects access to portability for China organization', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${chinaOrgId}/portability`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FEATURE_DISABLED_BY_JURISDICTION');
    });

    it('records an audit event when jurisdiction feature access is denied', async () => {
      const recentDenial = await prisma.auditLog.findFirst({
        where: {
          action: 'JURISDICTION_FEATURE_ACCESS_DENIED',
          organizationId: chinaOrgId,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(recentDenial).not.toBeNull();
      expect((recentDenial?.details as any)?.feature).toBe('PORTABILITY');
    });
  });

  describe('Country Changes & Policy Version Auditing', () => {
    it('Super Admin can change organization country, resolving new policy and logging audit trail', async () => {
      const changeRes = await request(app)
        .patch(`/api/v1/admin/organizations/${chinaOrgId}/country`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          countryCode: 'DE',
          reason: 'Relocated regional operations to Frankfurt, Germany',
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);
      expect(changeRes.body.data.countryCode).toBe('DE');
      expect(changeRes.body.data.countryName).toBe('Germany');

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'ORGANIZATION_COUNTRY_CHANGED',
          organizationId: chinaOrgId,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(audit).not.toBeNull();
      expect((audit?.details as any)?.previousCountryCode).toBe('CN');
      expect((audit?.details as any)?.newCountryCode).toBe('DE');
      expect((audit?.details as any)?.reason).toMatch(/relocated regional operations/i);
    });

    it('Super Admin can update/override policy settings with audit tracking', async () => {
      const policyRes = await request(app)
        .get('/api/v1/admin/policies/DE')
        .set('Authorization', `Bearer ${superAdminToken}`);
      const policyId = policyRes.body.data.id;

      const updateRes = await request(app)
        .patch(`/api/v1/admin/policies/${policyId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          humanReviewRequired: false,
          reason: 'Streamlined approval for test organization',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.humanReviewRequired).toBe(false);

      // Verify audit log
      const policyAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'JURISDICTION_POLICY_UPDATED',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(policyAudit).not.toBeNull();
      expect((policyAudit?.details as any)?.countryCode).toBe('DE');
    });
  });

  describe('Security & Role Restrictions', () => {
    it('HR Manager CANNOT change organization country or access admin policy endpoints (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${usOrgId}/country`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ countryCode: 'FR' });

      expect(res.status).toBe(403);
    });

    it('Employee CANNOT access admin policy endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/policies')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
