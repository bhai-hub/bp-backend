import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response';

export interface RequestValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validateRequest = (schema: RequestValidationSchema | AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if schema is a ZodObject with shape
      if ('shape' in schema) {
        const shape = (schema as any).shape;
        if (shape.body) {
          req.body = await shape.body.parseAsync(req.body);
        }
        if (shape.query) {
          req.query = (await shape.query.parseAsync(req.query)) as any;
        }
        if (shape.params) {
          req.params = (await shape.params.parseAsync(req.params)) as any;
        }
      } else {
        if (schema.body) {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
          req.query = (await schema.query.parseAsync(req.query)) as any;
        }
        if (schema.params) {
          req.params = (await schema.params.parseAsync(req.params)) as any;
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendError(res, 'Validation error', 400, errors);
        return;
      }
      sendError(res, 'Invalid request data', 400);
    }
  };
};
