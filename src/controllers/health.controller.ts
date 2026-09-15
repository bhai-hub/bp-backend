import { Request, Response } from 'express';

export class HealthController {
  check(req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      message: 'Brownie Points API is running',
    });
  }
}

export const healthController = new HealthController();
