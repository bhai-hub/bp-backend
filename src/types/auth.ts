export type RoleType = 'SUPER_ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';

export interface TokenPayload {
  userId: string;
  email: string;
  role: RoleType;
  organizationId: string | null;
  employeeId?: string | null;
}

export interface AuthenticatedUser extends TokenPayload {
  firstName: string;
  lastName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
