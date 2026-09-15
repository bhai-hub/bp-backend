import request from 'supertest';
import createApp from '../src/app';

const app = createApp();

describe('Role-Based Authorization & Multi-Tenancy Isolation Tests', () => {
  let superAdminToken: string;
  let acmeHrToken: string;
  let globexHrToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // 1. Login Super Admin
    const saRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@browniepoints.com',
      password: 'Admin@123456',
    });
    superAdminToken = saRes.body.data.token;

    // 2. Login Acme HR Manager
    const hrRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hr@acme.com',
      password: 'Hr@123456',
    });
    acmeHrToken = hrRes.body.data.token;

    // 3. Login Globex HR Manager
    const glxRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hr@globex.com',
      password: 'Hr@123456',
    });
    globexHrToken = glxRes.body.data.token;

    // 4. Login Employee
    const empRes = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.miller@acme.com',
      password: 'Employee@123',
    });
    employeeToken = empRes.body.data.token;
  });

  describe('Super Admin Route Access', () => {
    it('Super Admin can access admin dashboard and organizations list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toHaveProperty('totalOrganizations');
    });

    it('HR Manager CANNOT access admin dashboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${acmeHrToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden/i);
    });

    it('Employee CANNOT access admin dashboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('HR Route Access', () => {
    it('HR Manager can access HR dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/hr/dashboard')
        .set('Authorization', `Bearer ${acmeHrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.name).toBe('Acme Technologies');
    });

    it('Employee CANNOT access HR dashboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/hr/dashboard')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Multi-Tenancy & Organization Isolation', () => {
    it('HR Manager from Globex cannot view or credit Acme employees', async () => {
      // First get Acme employees using Acme HR token
      const acmeEmployeesRes = await request(app)
        .get('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${acmeHrToken}`);

      expect(acmeEmployeesRes.status).toBe(200);
      const acmeEmp = acmeEmployeesRes.body.data[0];
      expect(acmeEmp).toBeDefined();

      // Attempt to credit Acme employee using Globex HR token
      const maliciousCreditRes = await request(app)
        .post(`/api/v1/hr/employees/${acmeEmp.id}/bp-credit`)
        .set('Authorization', `Bearer ${globexHrToken}`)
        .send({
          amount: 500,
          reason: 'Cross-tenant credit attempt',
        });

      // Should be rejected with 404 (not found in your organization)
      expect(maliciousCreditRes.status).toBe(404);
      expect(maliciousCreditRes.body.success).toBe(false);
      expect(maliciousCreditRes.body.message).toMatch(/not found or does not belong to your organization/i);
    });
  });
});
