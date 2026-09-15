import { z } from 'zod';

export const validateTokenSchema = z.object({
  params: z.object({
    token: z.string().min(10, 'Invalid invitation token format'),
  }),
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(10, 'Invalid invitation token format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password is too long'),
  }),
});

export const completeProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    department: z.string().min(1, 'Department is required').optional(),
    designation: z.string().min(1, 'Designation is required').optional(),
  }),
});

export const resendInvitationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
});
