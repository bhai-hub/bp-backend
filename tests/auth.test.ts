import request from 'supertest';
import createApp from '../src/app';

const app = createApp();

describe('Authentication API Tests', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in Super Admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@browniepoints.com',
          password: 'Admin@123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('superadmin@browniepoints.com');
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should successfully log in HR Manager with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'hr@acme.com',
          password: 'Hr@123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('HR_MANAGER');
      expect(res.body.data.user.organizationId).toBeDefined();
    });

    it('should successfully log in Employee with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alex.miller@acme.com',
          password: 'Employee@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('EMPLOYEE');
      expect(res.body.data.user.employee).toBeDefined();
      expect(res.body.data.user.employee.wallet).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@browniepoints.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody@nowhere.com',
          password: 'SomePassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let validToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@browniepoints.com',
          password: 'Admin@123456',
        });
      validToken = res.body.data.token;
    });

    it('should return user profile with valid JWT', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('superadmin@browniepoints.com');
    });

    it('should reject request when JWT is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token is missing/i);
    });

    it('should reject request when JWT is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-string-xyz');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });
  });
});
