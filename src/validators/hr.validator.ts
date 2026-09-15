import { z } from 'zod';

export const createEmployeeSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').default('Welcome@123'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    employeeCode: z.string().min(1, 'Employee code is required'),
    department: z.string().min(1, 'Department is required'),
    designation: z.string().min(1, 'Designation is required'),
    joiningDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  }),
});

export const bpCreditSchema = z.object({
  params: z.object({
    employeeId: z.string().uuid('Invalid employee ID format'),
  }),
  body: z.object({
    amount: z.number().int().positive('Amount must be a positive integer'),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

export const updateEmployeeStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid employee ID format'),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
});
