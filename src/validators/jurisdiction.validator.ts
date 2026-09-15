import { z } from 'zod';

export const updateJurisdictionPolicySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid policy ID format'),
  }),
  body: z.object({
    leaderboardEnabled: z.boolean().optional(),
    publicProfileEnabled: z.boolean().optional(),
    portabilityEnabled: z.boolean().optional(),
    redemptionEnabled: z.boolean().optional(),
    nonCashRedemptionOnly: z.boolean().optional(),
    automatedDecisionEnabled: z.boolean().optional(),
    humanReviewRequired: z.boolean().optional(),
    consentRequired: z.boolean().optional(),
    dataLocationPolicy: z.string().optional(),
    retentionPolicy: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    reason: z.string().optional(),
  }),
});

export const changeOrganizationCountrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization ID format'),
  }),
  body: z.object({
    countryCode: z.string().min(2).max(3).toUpperCase(),
    reason: z.string().min(2, 'Reason for country change is required for auditability').optional(),
  }),
});

export const createJurisdictionPolicySchema = z.object({
  body: z.object({
    countryCode: z.string().min(2).max(3).toUpperCase(),
    policyVersion: z.number().int().positive().optional(),
    status: z.string().default('CONFIGURED'),
    leaderboardEnabled: z.boolean().default(true),
    publicProfileEnabled: z.boolean().default(true),
    portabilityEnabled: z.boolean().default(true),
    redemptionEnabled: z.boolean().default(true),
    nonCashRedemptionOnly: z.boolean().default(true),
    automatedDecisionEnabled: z.boolean().default(false),
    humanReviewRequired: z.boolean().default(false),
    consentRequired: z.boolean().default(false),
    dataLocationPolicy: z.string().default('GLOBAL'),
    retentionPolicy: z.string().default('STANDARD'),
    description: z.string().optional(),
    reason: z.string().optional(),
  }),
});
