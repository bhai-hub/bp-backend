import { z } from 'zod';

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    legalName: z.string().min(2, 'Legal name must be at least 2 characters'),
    slug: z
      .string()
      .min(2)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lower-case alphanumeric with dashes')
      .optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(5, 'Phone number must be at least 5 characters'),
    countryCode: z.string().min(2, 'Country code is required').max(3).toUpperCase(),
    timezone: z.string().default('UTC'),
    currency: z.string().default('USD'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    bpPolicy: z.record(z.any()).optional(),
  }),
});

export const updateOrgStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization ID format'),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
});

export const updateOrgPolicySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization ID format'),
  }),
  body: z.object({
    bpPolicy: z.record(z.any()),
  }),
});

export const bpPurchaseSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid organization ID format'),
  }),
  body: z.object({
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    reference: z.string().min(1, 'Reference is required'),
    description: z.string().optional(),
  }),
});

export const createHrManagerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    organizationId: z.string().uuid('Invalid organization ID format'),
  }),
});
