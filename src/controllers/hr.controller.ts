import { Request, Response, NextFunction } from 'express';
import { hrService } from '../services/hr.service';
import { employeeService } from '../services/employee.service';
import { organizationService } from '../services/organization.service';
import { bpTransactionRepository } from '../repositories/bpTransaction.repository';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class HrController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) {
        throw new AppError('HR Manager has no organization assigned', 400);
      }
      const data = await hrService.getHrDashboardMetrics(orgId);
      sendSuccess(res, data, 'HR dashboard metrics retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) {
        throw new AppError('HR Manager has no organization assigned', 400);
      }
      const org = await organizationService.getOrganizationById(orgId);
      sendSuccess(res, org, 'Organization details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hrUser = {
        organizationId: req.user?.organizationId || null,
        userId: req.user!.userId,
      };
      const employee = await employeeService.createEmployee(hrUser, req.body);
      sendSuccess(res, employee, 'Employee created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) {
        throw new AppError('HR Manager has no organization assigned', 400);
      }
      const employees = await employeeService.getEmployeesByOrg(orgId);
      sendSuccess(res, employees, 'Employees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateEmployeeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hrUser = {
        organizationId: req.user?.organizationId || null,
        userId: req.user!.userId,
      };
      const updated = await employeeService.updateEmployeeStatus(
        hrUser,
        req.params.id,
        req.body.status,
      );
      sendSuccess(res, updated, 'Employee status updated');
    } catch (error) {
      next(error);
    }
  }

  async creditBP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hrUser = {
        organizationId: req.user?.organizationId || null,
        userId: req.user!.userId,
      };
      const { employeeId } = req.params;
      const { amount, reason } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await employeeService.creditBP(
        hrUser,
        employeeId,
        amount,
        reason,
        ipAddress,
      );

      sendSuccess(res, result, 'Brownie Points credited successfully');
    } catch (error) {
      next(error);
    }
  }

  async getBPActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) {
        throw new AppError('HR Manager has no organization assigned', 400);
      }
      const activity = await bpTransactionRepository.findByOrganization(orgId, 100);
      sendSuccess(res, activity, 'Organization BP activity retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const hrController = new HrController();
