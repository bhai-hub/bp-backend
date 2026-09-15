import {
  PrismaClient,
  Role,
  OrgStatus,
  EmployeeStatus,
  TransactionType,
  OnboardingStatus,
  IkigaiDimension,
  IkigaiQuestionType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { hashToken } from '../src/utils/token';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Brownie Points database with Countries, Policies, Ikigai Questionnaire, and Organizations...');

  // 1. Clear existing data in reverse relational order
  await prisma.ikigaiResponse.deleteMany({});
  await prisma.ikigaiQuestion.deleteMany({});
  await prisma.ikigaiQuestionnaire.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.bPTransaction.deleteMany({});
  await prisma.employeeWallet.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organizationBPAccount.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.jurisdictionPolicy.deleteMany({});
  await prisma.country.deleteMany({});

  // 2. Seed Country Reference Data
  const countries = [
    { code: 'IN', name: 'India', isActive: true },
    { code: 'US', name: 'United States', isActive: true },
    { code: 'GB', name: 'United Kingdom', isActive: true },
    { code: 'DE', name: 'Germany', isActive: true },
    { code: 'FR', name: 'France', isActive: true },
    { code: 'SG', name: 'Singapore', isActive: true },
    { code: 'AU', name: 'Australia', isActive: true },
    { code: 'CA', name: 'Canada', isActive: true },
    { code: 'CN', name: 'China', isActive: true },
  ];

  for (const c of countries) {
    await prisma.country.create({ data: c });
  }
  console.log(`Created ${countries.length} standard reference countries.`);

  // 3. Seed Jurisdiction Policies (Version 1 Profiles)
  const indiaPolicy = await prisma.jurisdictionPolicy.create({
    data: {
      countryCode: 'IN',
      policyVersion: 1,
      isActive: true,
      status: 'CONFIGURED',
      leaderboardEnabled: true,
      publicProfileEnabled: true,
      portabilityEnabled: true,
      redemptionEnabled: true,
      nonCashRedemptionOnly: true,
      automatedDecisionEnabled: false,
      humanReviewRequired: true,
      consentRequired: true,
      dataLocationPolicy: 'IN_COUNTRY_OPTION',
      retentionPolicy: 'CONFIGURABLE',
      description: 'India v1: Consent-led data handling, safer non-cash classification, and configurable data retention.',
    },
  });

  const usPolicy = await prisma.jurisdictionPolicy.create({
    data: {
      countryCode: 'US',
      policyVersion: 1,
      isActive: true,
      status: 'CONFIGURED',
      leaderboardEnabled: true,
      publicProfileEnabled: true,
      portabilityEnabled: false,
      redemptionEnabled: true,
      nonCashRedemptionOnly: true,
      automatedDecisionEnabled: false,
      humanReviewRequired: false,
      consentRequired: false,
      dataLocationPolicy: 'GLOBAL',
      retentionPolicy: 'STANDARD',
      description: 'United States v1: Strict non-cash redemption to avoid wage reclassification, robust audit logging.',
    },
  });

  const dePolicy = await prisma.jurisdictionPolicy.create({
    data: {
      countryCode: 'DE',
      policyVersion: 1,
      isActive: true,
      status: 'CONFIGURED',
      leaderboardEnabled: false,
      publicProfileEnabled: false,
      portabilityEnabled: false,
      redemptionEnabled: true,
      nonCashRedemptionOnly: true,
      automatedDecisionEnabled: false,
      humanReviewRequired: true,
      consentRequired: true,
      dataLocationPolicy: 'EU_ONLY',
      retentionPolicy: 'CONFIGURABLE',
      description: 'Germany v1: Works-council considerations (no public leaderboards/rankings), human-in-the-loop review.',
    },
  });

  const cnPolicy = await prisma.jurisdictionPolicy.create({
    data: {
      countryCode: 'CN',
      policyVersion: 1,
      isActive: true,
      status: 'CONFIGURED',
      leaderboardEnabled: false,
      publicProfileEnabled: false,
      portabilityEnabled: false,
      redemptionEnabled: true,
      nonCashRedemptionOnly: true,
      automatedDecisionEnabled: false,
      humanReviewRequired: false,
      consentRequired: false,
      dataLocationPolicy: 'LOCAL_ONLY',
      retentionPolicy: 'STRICT_PRUNING',
      description: 'China v1: Anti-social-scoring safeguards, local data residency, strict annual audit pruning.',
    },
  });

  const standardProfiles = [
    { code: 'GB', name: 'United Kingdom', dataLoc: 'GLOBAL' },
    { code: 'FR', name: 'France', dataLoc: 'EU_ONLY' },
    { code: 'SG', name: 'Singapore', dataLoc: 'GLOBAL' },
    { code: 'AU', name: 'Australia', dataLoc: 'GLOBAL' },
    { code: 'CA', name: 'Canada', dataLoc: 'GLOBAL' },
  ];

  for (const sp of standardProfiles) {
    await prisma.jurisdictionPolicy.create({
      data: {
        countryCode: sp.code,
        policyVersion: 1,
        isActive: true,
        status: 'CONFIGURED',
        leaderboardEnabled: true,
        publicProfileEnabled: true,
        portabilityEnabled: true,
        redemptionEnabled: true,
        nonCashRedemptionOnly: true,
        automatedDecisionEnabled: false,
        humanReviewRequired: sp.code === 'FR',
        consentRequired: sp.code === 'FR',
        dataLocationPolicy: sp.dataLoc,
        retentionPolicy: 'STANDARD',
        description: `${sp.name} v1 standard commercial enterprise policy profile.`,
      },
    });
  }

  // 4. Seed Configurable Versioned Ikigai Questionnaire (Version 1)
  const ikigaiQuestionnaire = await prisma.ikigaiQuestionnaire.create({
    data: {
      version: 1,
      title: 'Professional Purpose & Alignment Questionnaire',
      description:
        'A structured, employee-owned self-reflection questionnaire across the four Ikigai dimensions: What you love, what you are good at, what the world needs, and what creates professional value.',
      isActive: true,
    },
  });

  const questionsData = [
    // Dimension 1: LOVE
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.LOVE,
      questionText: 'What kinds of work activities do you genuinely enjoy and look forward to?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 1,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.LOVE,
      questionText: 'What tasks or projects make you feel most engaged, focused, or energized?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 2,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.LOVE,
      questionText: 'What type of team collaboration or creative problem-solving brings out your best energy?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 3,
      isRequired: false,
    },
    // Dimension 2: GOOD_AT
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.GOOD_AT,
      questionText: 'What core professional capabilities do you consider your greatest strengths?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 4,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.GOOD_AT,
      questionText: 'What kinds of problems or topics do colleagues usually reach out to you to solve?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 5,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.GOOD_AT,
      questionText: 'What emerging domain, leadership, or technical skills are you actively developing?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 6,
      isRequired: false,
    },
    // Dimension 3: WORLD_NEEDS
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.WORLD_NEEDS,
      questionText: 'What workplace, community, or customer challenges matter most to you?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 7,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.WORLD_NEEDS,
      questionText: 'What positive impact or measurable improvements would you like to champion in your team?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 8,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.WORLD_NEEDS,
      questionText: 'Which collaborative or cultural initiatives do you feel our workplace needs more of?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 9,
      isRequired: false,
    },
    // Dimension 4: PAID_FOR
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.PAID_FOR,
      questionText: 'Which of your skills and contributions deliver the highest organizational and business value?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 10,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.PAID_FOR,
      questionText: 'What professional milestones, responsibilities, or leadership opportunities are you aiming for?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 11,
      isRequired: true,
    },
    {
      questionnaireId: ikigaiQuestionnaire.id,
      dimension: IkigaiDimension.PAID_FOR,
      questionText: 'What strategic business domains would you like to master over the next 1–2 years?',
      questionType: IkigaiQuestionType.LONG_TEXT,
      displayOrder: 12,
      isRequired: false,
    },
  ];

  const seededQuestions: any[] = [];
  for (const q of questionsData) {
    const createdQ = await prisma.ikigaiQuestion.create({ data: q });
    seededQuestions.push(createdQ);
  }
  console.log(`Created Ikigai Questionnaire v1 with ${seededQuestions.length} structured questions.`);

  // 5. Seed Users & Organizations
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const hrPassword = await bcrypt.hash('Hr@123456', 10);
  const employeePassword = await bcrypt.hash('Employee@123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@browniepoints.com',
      passwordHash: adminPassword,
      role: Role.SUPER_ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
      status: OrgStatus.ACTIVE,
    },
  });

  // Organization 1: Acme Technologies (US)
  const acme = await prisma.organization.create({
    data: {
      name: 'Acme Technologies',
      legalName: 'Acme Technologies Inc.',
      slug: 'acme-corp',
      email: 'contact@acme.com',
      phone: '+1 555 0199',
      countryCode: 'US',
      countryName: 'United States',
      jurisdictionPolicyVersion: 1,
      jurisdictionPolicyId: usPolicy.id,
      timezone: 'America/New_York',
      currency: 'USD',
      status: OrgStatus.ACTIVE,
      bpPolicy: {
        monthlyCapPerEmployee: 5000,
        allowManagerDiscretionaryCredit: true,
        welcomeBonusBP: 1000,
      },
      bpAccount: {
        create: {
          purchasedBP: 500000,
          allocatedBP: 35000,
          availableBP: 465000,
        },
      },
    },
  });

  await prisma.bPTransaction.create({
    data: {
      organizationId: acme.id,
      type: TransactionType.PURCHASE,
      amount: 500000,
      reference: 'INIT-ACM-PURCHASE-2026',
      description: 'Acme initial enterprise BP purchase',
      createdByUserId: superAdmin.id,
    },
  });

  const acmeHr = await prisma.user.create({
    data: {
      email: 'hr@acme.com',
      passwordHash: hrPassword,
      role: Role.HR_MANAGER,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      organizationId: acme.id,
      status: OrgStatus.ACTIVE,
    },
  });

  // Employee 1: Alex Miller (COMPLETED Onboarding)
  const alexUser = await prisma.user.create({
    data: {
      email: 'alex.miller@acme.com',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
      firstName: 'Alex',
      lastName: 'Miller',
      organizationId: acme.id,
      status: OrgStatus.ACTIVE,
    },
  });

  const alexEmployee = await prisma.employee.create({
    data: {
      userId: alexUser.id,
      organizationId: acme.id,
      employeeCode: 'ACM-101',
      department: 'Engineering',
      designation: 'Staff Software Engineer',
      joiningDate: new Date('2023-01-15'),
      status: EmployeeStatus.ACTIVE,
      onboardingStatus: OnboardingStatus.COMPLETED,
      onboardingCompletedAt: new Date('2023-01-16'),
      wallet: {
        create: {
          spendableBalance: 25000,
          loyaltyBalance: 5000,
          lifetimeBalance: 30000,
        },
      },
    },
  });

  await prisma.bPTransaction.create({
    data: {
      organizationId: acme.id,
      employeeId: alexEmployee.id,
      type: TransactionType.ALLOCATION,
      amount: 25000,
      reference: 'ALLOC-ACM-101',
      description: 'Q3 Architectural Excellence & Mentorship Award',
      createdByUserId: acmeHr.id,
    },
  });

  // Seed Ikigai Responses for Alex Miller
  const alexResponses = [
    { questionIdx: 0, text: 'Designing clean, resilient distributed systems and mentoring junior developers.' },
    { questionIdx: 1, text: 'Tackling high-concurrency throughput bottlenecks and refactoring legacy architectures.' },
    { questionIdx: 3, text: 'TypeScript, scalable systems architecture, and automated API design.' },
    { questionIdx: 4, text: 'Complex database schema optimization and API performance tuning.' },
    { questionIdx: 6, text: 'Ensuring zero data loss and bulletproof privacy controls for enterprise platforms.' },
    { questionIdx: 7, text: 'Building transparent, trustworthy software that employees truly rely on.' },
    { questionIdx: 9, text: 'Translating complex enterprise requirements into robust, maintainable cloud software.' },
    { questionIdx: 10, text: 'Advancing towards Principal Engineer and Technical Director responsibilities.' },
  ];

  for (const ar of alexResponses) {
    const q = seededQuestions[ar.questionIdx];
    await prisma.ikigaiResponse.create({
      data: {
        organizationId: acme.id,
        employeeId: alexEmployee.id,
        questionnaireId: ikigaiQuestionnaire.id,
        questionId: q.id,
        dimension: q.dimension,
        response: ar.text,
      },
    });
  }

  // Employee 2: Jane Cooper (COMPLETED Onboarding)
  const janeUser = await prisma.user.create({
    data: {
      email: 'jane.cooper@acme.com',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
      firstName: 'Jane',
      lastName: 'Cooper',
      organizationId: acme.id,
      status: OrgStatus.ACTIVE,
    },
  });

  const janeEmployee = await prisma.employee.create({
    data: {
      userId: janeUser.id,
      organizationId: acme.id,
      employeeCode: 'ACM-102',
      department: 'Design',
      designation: 'Lead UI/UX Architect',
      joiningDate: new Date('2024-03-01'),
      status: EmployeeStatus.ACTIVE,
      onboardingStatus: OnboardingStatus.COMPLETED,
      onboardingCompletedAt: new Date('2024-03-02'),
      wallet: {
        create: {
          spendableBalance: 10000,
          loyaltyBalance: 0,
          lifetimeBalance: 10000,
        },
      },
    },
  });

  await prisma.bPTransaction.create({
    data: {
      organizationId: acme.id,
      employeeId: janeEmployee.id,
      type: TransactionType.ALLOCATION,
      amount: 10000,
      reference: 'ALLOC-ACM-102',
      description: 'Product Redesign Milestone Delivery',
      createdByUserId: acmeHr.id,
    },
  });

  // Employee 3: Pending Invited Employee (INVITED Onboarding)
  const pendingUser = await prisma.user.create({
    data: {
      email: 'pending.onboarding@acme.com',
      passwordHash: await bcrypt.hash('TempPassword@999', 10),
      role: Role.EMPLOYEE,
      firstName: 'Michael',
      lastName: 'Scott',
      organizationId: acme.id,
      status: OrgStatus.ACTIVE,
    },
  });

  const rawInviteToken = 'demo-invite-token-acme-2026';
  const inviteTokenHash = hashToken(rawInviteToken);
  const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.employee.create({
    data: {
      userId: pendingUser.id,
      organizationId: acme.id,
      employeeCode: 'ACM-103',
      department: 'Product Strategy',
      designation: 'Product Associate',
      joiningDate: new Date(),
      status: EmployeeStatus.ACTIVE,
      onboardingStatus: OnboardingStatus.INVITED,
      invitationTokenHash: inviteTokenHash,
      invitationExpiresAt: inviteExpiry,
      wallet: {
        create: {
          spendableBalance: 0,
          loyaltyBalance: 0,
          lifetimeBalance: 0,
        },
      },
    },
  });

  // Organization 2: Globex Corporation (India Jurisdiction)
  const globex = await prisma.organization.create({
    data: {
      name: 'Globex Corporation',
      legalName: 'Globex International Corp Pvt Ltd',
      slug: 'globex-corp',
      email: 'contact@globex.com',
      phone: '+91 22 555 0833',
      countryCode: 'IN',
      countryName: 'India',
      jurisdictionPolicyVersion: 1,
      jurisdictionPolicyId: indiaPolicy.id,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      status: OrgStatus.ACTIVE,
      bpPolicy: {
        monthlyCapPerEmployee: 7500,
        allowManagerDiscretionaryCredit: true,
        welcomeBonusBP: 500,
      },
      bpAccount: {
        create: {
          purchasedBP: 100000,
          allocatedBP: 5000,
          availableBP: 95000,
        },
      },
    },
  });

  await prisma.bPTransaction.create({
    data: {
      organizationId: globex.id,
      type: TransactionType.PURCHASE,
      amount: 100000,
      reference: 'INIT-GLX-PURCHASE-2026',
      description: 'Globex Corp initial BP purchase',
      createdByUserId: superAdmin.id,
    },
  });

  const globexHr = await prisma.user.create({
    data: {
      email: 'hr@globex.com',
      passwordHash: hrPassword,
      role: Role.HR_MANAGER,
      firstName: 'Marcus',
      lastName: 'Vance',
      organizationId: globex.id,
      status: OrgStatus.ACTIVE,
    },
  });

  const globexEmpUser = await prisma.user.create({
    data: {
      email: 'david.lee@globex.com',
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
      firstName: 'David',
      lastName: 'Lee',
      organizationId: globex.id,
      status: OrgStatus.ACTIVE,
    },
  });

  const globexEmp = await prisma.employee.create({
    data: {
      userId: globexEmpUser.id,
      organizationId: globex.id,
      employeeCode: 'GLX-201',
      department: 'Enterprise Sales',
      designation: 'Senior Account Executive',
      joiningDate: new Date('2024-05-10'),
      status: EmployeeStatus.ACTIVE,
      onboardingStatus: OnboardingStatus.COMPLETED,
      onboardingCompletedAt: new Date('2024-05-11'),
      wallet: {
        create: {
          spendableBalance: 5000,
          loyaltyBalance: 0,
          lifetimeBalance: 5000,
        },
      },
    },
  });

  await prisma.bPTransaction.create({
    data: {
      organizationId: globex.id,
      employeeId: globexEmp.id,
      type: TransactionType.ALLOCATION,
      amount: 5000,
      reference: 'ALLOC-GLX-201',
      description: 'Top Enterprise Sales Performance Q2',
      createdByUserId: globexHr.id,
    },
  });

  // Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SYSTEM_INITIALIZED',
        organizationId: null,
        userId: superAdmin.id,
        details: { version: '1.2.0', module: 'ONBOARDING_IKIGAI_FOUNDATION' },
      },
      {
        action: 'ORGANIZATION_CREATED',
        organizationId: acme.id,
        userId: superAdmin.id,
        details: { name: acme.name, countryCode: 'US', policyVersion: 1 },
      },
      {
        action: 'ORGANIZATION_CREATED',
        organizationId: globex.id,
        userId: superAdmin.id,
        details: { name: globex.name, countryCode: 'IN', policyVersion: 1 },
      },
      {
        action: 'IKIGAI_QUESTIONNAIRE_INITIALIZED',
        organizationId: null,
        userId: superAdmin.id,
        details: { version: 1, questionsCount: seededQuestions.length },
      },
    ],
  });

  console.log('✅ Brownie Points database seeded successfully with Countries, Policies, Organizations, and Ikigai!');
  console.log(`Demo Invitation Token for pending.onboarding@acme.com: ${rawInviteToken}`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
