import { Request, Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service';
import { sendSuccess } from '../utils/response';

export class EmployeeController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await employeeService.getEmployeeMe(userId);
      sendSuccess(res, data, 'Employee profile and wallet retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await employeeService.updateEmployeeMe(userId, req.body);
      sendSuccess(res, data, 'Employee profile updated');
    } catch (error) {
      next(error);
    }
  }

  async getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await employeeService.getEmployeeMe(userId);
      sendSuccess(res, data.wallet, 'Wallet balance retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const activity = await employeeService.getEmployeeActivity(userId);
      sendSuccess(res, activity, 'Employee BP activity retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const employeeController = new EmployeeController();
