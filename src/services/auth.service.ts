import { userRepository } from '../repositories/user.repository';
import { comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is inactive. Please contact your administrator.', 403);
    }

    if (user.organization && user.organization.status !== 'ACTIVE') {
      throw new AppError('Organization account is inactive. Please contact support.', 403);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employee?.id || null,
    };

    const token = generateToken(tokenPayload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          currency: user.organization.currency,
        } : null,
        employee: user.employee ? {
          id: user.employee.id,
          employeeCode: user.employee.employeeCode,
          department: user.employee.department,
          designation: user.employee.designation,
          onboardingStatus: user.employee.onboardingStatus,
          onboardingCompletedAt: user.employee.onboardingCompletedAt,
          wallet: user.employee.wallet,
        } : null,
      },
    };
  }

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
      employee: user.employee,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
