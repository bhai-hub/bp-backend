import request from 'supertest';
import createApp from '../src/app';
import prisma from '../src/config/prisma';
import { OnboardingStatus } from '@prisma/client';

const app = createApp();

describe('Employee Onboarding Lifecycle & Ikigai Module Tests', () => {
  let hrToken: string;
  let globexHrToken: string;
  let employeeToken: string;
  let acmeOrgId: string;
  let globexOrgId: string;

  let createdEmployeeId: string;
  let rawInvitationToken: string;
  let newEmployeeToken: string;
  let activeQuestionnaireId: string;
  let activeQuestions: any[];

  beforeAll(async () => {
    // 1. HR Manager Login (Acme)
    const hrRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hr@acme.com',
      password: 'Hr@123456',
    });
    hrToken = hrRes.body.data.token;
    acmeOrgId = hrRes.body.data.user.organizationId;

    // 2. HR Manager Login (Globex - Tenant 2)
    const gHrRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hr@globex.com',
      password: 'Hr@123456',
    });
    globexHrToken = gHrRes.body.data.token;
    globexOrgId = gHrRes.body.data.user.organizationId;

    // 3. Completed Employee Login (Alex Miller)
    const empRes = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.miller@acme.com',
      password: 'Employee@123',
    });
    employeeToken = empRes.body.data.token;
  });

  describe('1. HR Employee Creation & Invitation Flow', () => {
    // Test 1: HR creates employee in INVITED state
    it('should allow HR to create employee with generated invitation and INVITED status', async () => {
      const code = `TEST-EMP-${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          email: `onboarding.test.${Date.now()}@acme.com`,
          firstName: 'Jonathan',
          lastName: 'Doe',
          employeeCode: code,
          department: 'Quality Assurance',
          designation: 'QA Automation Engineer',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.onboardingStatus).toBe('INVITED');
      expect(res.body.data.invitationToken).toBeDefined();
      expect(typeof res.body.data.invitationToken).toBe('string');

      createdEmployeeId = res.body.data.id;
      rawInvitationToken = res.body.data.invitationToken;

      // Verify token hash is stored, but NOT raw token
      const dbEmp = await prisma.employee.findUnique({
        where: { id: createdEmployeeId },
      });
      expect(dbEmp?.invitationTokenHash).toBeDefined();
      expect(dbEmp?.invitationTokenHash).not.toBe(rawInvitationToken);
      expect(dbEmp?.invitationExpiresAt).toBeDefined();
    });

    // Test 2: Unauthorized user cannot create employee
    it('should reject employee creation from an employee user (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: `unauth.${Date.now()}@acme.com`,
          firstName: 'Hacker',
          lastName: 'User',
          employeeCode: 'HACK-01',
          department: 'Security',
          designation: 'Penetration Tester',
        });

      expect(res.status).toBe(403);
    });

    // Test 3: Employee belongs to correct organization (Organization isolation)
    it('should assign employee strictly to the HR manager organization', async () => {
      const dbEmp = await prisma.employee.findUnique({
        where: { id: createdEmployeeId },
      });
      expect(dbEmp?.organizationId).toBe(acmeOrgId);
    });

    // Test 4: HR cannot resend or access employee belonging to another organization
    it('should reject HR from Globex attempting to resend invitation for Acme employee', async () => {
      const res = await request(app)
        .post(`/api/v1/hr/employees/${createdEmployeeId}/resend-invitation`)
        .set('Authorization', `Bearer ${globexHrToken}`)
        .send();

      expect(res.status).toBe(404);
    });

    // Test 5: HR can resend invitation for their own organization employee
    it('should allow Acme HR to resend invitation, rotating the invitation token', async () => {
      const res = await request(app)
        .post(`/api/v1/hr/employees/${createdEmployeeId}/resend-invitation`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invitationToken).toBeDefined();
      expect(res.body.data.invitationToken).not.toBe(rawInvitationToken);

      rawInvitationToken = res.body.data.invitationToken;
    });
  });

  describe('2. Public Invitation Validation & Expiration', () => {
    // Test 6: Validate invitation preview
    it('should return safe public organization and employee details for valid token', async () => {
      const res = await request(app)
        .get(`/api/v1/onboarding/invitation/${rawInvitationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organizationName).toBe('Acme Technologies');
      expect(res.body.data.firstName).toBe('Jonathan');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    // Test 7: Reject expired invitation
    it('should reject an expired invitation token (410 Gone)', async () => {
      // Set expiration in the past
      await prisma.employee.update({
        where: { id: createdEmployeeId },
        data: { invitationExpiresAt: new Date(Date.now() - 1000 * 60) },
      });

      const res = await request(app)
        .get(`/api/v1/onboarding/invitation/${rawInvitationToken}`);

      expect(res.status).toBe(410);

      // Restore expiration
      await prisma.employee.update({
        where: { id: createdEmployeeId },
        data: { invitationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) },
      });
    });

    // Test 8: Reject non-existent or invalid token
    it('should return 404 for an unknown or bogus invitation token', async () => {
      const res = await request(app)
        .get('/api/v1/onboarding/invitation/completely-bogus-token-1234567890');

      expect(res.status).toBe(404);
    });
  });

  describe('3. Invitation Acceptance & Profile Completion', () => {
    // Test 9: Employee accepts invitation, sets password, and establishes session
    it('should accept invitation, activate account, and advance status to PROFILE_PENDING', async () => {
      const res = await request(app)
        .post('/api/v1/onboarding/invitation/accept')
        .send({
          token: rawInvitationToken,
          password: 'NewSecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.onboardingStatus).toBe('PROFILE_PENDING');

      newEmployeeToken = res.body.data.token;

      // Verify token is single-use and invalidated in DB
      const dbEmp = await prisma.employee.findUnique({
        where: { id: createdEmployeeId },
      });
      expect(dbEmp?.invitationTokenHash).toBeNull();
      expect(dbEmp?.onboardingStatus).toBe('PROFILE_PENDING');
    });

    // Test 10: Invitation cannot be reused after acceptance
    it('should reject reuse of an already accepted invitation token (404/400)', async () => {
      const res = await request(app)
        .post('/api/v1/onboarding/invitation/accept')
        .send({
          token: rawInvitationToken,
          password: 'AnotherPassword123!',
        });

      expect(res.status).toBe(404);
    });

    // Test 11: Employee completes profile details
    it('should complete profile stage and advance onboarding to IKIGAI_PENDING', async () => {
      const res = await request(app)
        .post('/api/v1/onboarding/profile')
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .send({
          firstName: 'Jonathan',
          lastName: 'Doe',
          department: 'Core Platform QA',
          designation: 'Senior Test Engineer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.onboardingStatus).toBe('IKIGAI_PENDING');

      const dbEmp = await prisma.employee.findUnique({
        where: { id: createdEmployeeId },
      });
      expect(dbEmp?.onboardingStatus).toBe('IKIGAI_PENDING');
      expect(dbEmp?.department).toBe('Core Platform QA');
    });
  });

  describe('4. Ikigai Questionnaire & Reflections', () => {
    // Test 12: Dynamic questionnaire loading
    it('should load active Ikigai questionnaire with 4 dimensions for authenticated employee', async () => {
      const res = await request(app)
        .get('/api/v1/ikigai/questionnaire/current')
        .set('Authorization', `Bearer ${newEmployeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dimensions.LOVE).toBeDefined();
      expect(res.body.data.dimensions.GOOD_AT).toBeDefined();
      expect(res.body.data.dimensions.WORLD_NEEDS).toBeDefined();
      expect(res.body.data.dimensions.PAID_FOR).toBeDefined();

      activeQuestionnaireId = res.body.data.id;
      activeQuestions = res.body.data.questions;
      expect(activeQuestions.length).toBeGreaterThanOrEqual(4);
    });

    // Test 13: Reject submission with invalid question ID
    it('should reject response containing invalid question ID', async () => {
      const res = await request(app)
        .post('/api/v1/ikigai/responses')
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .send({
          questionnaireId: activeQuestionnaireId,
          responses: [
            {
              questionId: '00000000-0000-0000-0000-000000000000',
              response: 'Some answer',
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    // Test 14: Reject submission missing required questions
    it('should reject submission when required questions are omitted', async () => {
      const res = await request(app)
        .post('/api/v1/ikigai/responses')
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .send({
          questionnaireId: activeQuestionnaireId,
          responses: [
            {
              questionId: activeQuestions[0].id,
              response: 'Only one question answered',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    // Test 15: Valid submission across all required dimensions completes onboarding
    it('should accept valid responses, persist them, and transition onboardingStatus to COMPLETED', async () => {
      const validResponses = activeQuestions.map((q) => ({
        questionId: q.id,
        response: `My thoughtful reflection for: ${q.questionText}`,
      }));

      const res = await request(app)
        .post('/api/v1/ikigai/responses')
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .send({
          questionnaireId: activeQuestionnaireId,
          responses: validResponses,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.onboardingStatus).toBe('COMPLETED');
      expect(res.body.data.onboardingCompletedAt).toBeDefined();

      // Verify DB persistence
      const dbEmp = await prisma.employee.findUnique({
        where: { id: createdEmployeeId },
      });
      expect(dbEmp?.onboardingStatus).toBe('COMPLETED');
      expect(dbEmp?.onboardingCompletedAt).toBeDefined();

      const responsesCount = await prisma.ikigaiResponse.count({
        where: { employeeId: createdEmployeeId },
      });
      expect(responsesCount).toBe(validResponses.length);
    });

    // Test 16: Employee can view their own Ikigai reflections
    it('should return employee personal reflections grouped by dimension', async () => {
      const res = await request(app)
        .get('/api/v1/ikigai/me')
        .set('Authorization', `Bearer ${newEmployeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAnswered).toBeGreaterThan(0);
      expect(res.body.data.byDimension.LOVE.length).toBeGreaterThan(0);
      expect(res.body.data.byDimension.GOOD_AT.length).toBeGreaterThan(0);
    });

    // Test 17: Employee can update their own reflections post-onboarding
    it('should allow employee to update their Ikigai reflections', async () => {
      const updatePayload = [
        {
          questionId: activeQuestions[0].id,
          response: 'Updated reflection: now passionate about AI quality and system reliability.',
        },
      ];

      const res = await request(app)
        .put('/api/v1/ikigai/responses')
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .send({
          questionnaireId: activeQuestionnaireId,
          responses: updatePayload,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbResponse = await prisma.ikigaiResponse.findUnique({
        where: {
          employeeId_questionId: {
            employeeId: createdEmployeeId,
            questionId: activeQuestions[0].id,
          },
        },
      });
      expect(dbResponse?.response).toContain('Updated reflection');
    });

    // Test 18: HR cannot access or fabricate employee Ikigai responses
    it('should reject HR Manager attempting to access employee Ikigai endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/ikigai/me')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(403);
    });

    // Test 19: An employee cannot access or overwrite another employee responses
    it('should ensure Alex Miller receives only his own responses, not Jonathan Doe', async () => {
      const res = await request(app)
        .get('/api/v1/ikigai/me')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.employeeId).not.toBe(createdEmployeeId);
    });
  });

  describe('5. Onboarding Status in HR Listing', () => {
    // Test 20: HR employee listing includes onboardingStatus
    it('should return onboardingStatus in HR employees roster', async () => {
      const res = await request(app)
        .get('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const employees = res.body.data;
      expect(employees.length).toBeGreaterThanOrEqual(2);
      for (const emp of employees) {
        expect(emp.onboardingStatus).toBeDefined();
      }
    });
  });
});
