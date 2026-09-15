import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  errors?: any;

  constructor(message: string, statusCode = 500, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  logger.error('Centralized Error Handler caught error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const targets = err.meta?.target ? ` (${err.meta.target})` : '';
    sendError(res, `A record with this field already exists${targets}.`, 409);
    return;
  }

  // Handle Prisma not found (P2025)
  if (err.code === 'P2025') {
    sendError(res, err.meta?.cause || 'Record not found', 404);
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  sendError(res, message, statusCode);
};
