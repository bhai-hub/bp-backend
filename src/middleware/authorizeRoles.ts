import { Request, Response, NextFunction } from 'express';
import { RoleType } from '../types/auth';
import { sendError } from '../utils/response';

export const authorizeRoles = (...allowedRoles: RoleType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'User is not authenticated', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Forbidden: You do not have permission to access this resource', 403);
      return;
    }

    next();
  };
};
