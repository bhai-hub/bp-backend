import { Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';
import { bpService } from '../services/bp.service';
import { hrService } from '../services/hr.service';
import { sendSuccess } from '../utils/response';

export class AdminController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await hrService.getAdminDashboardMetrics();
      sendSuccess(res, data, 'Admin dashboard metrics retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const org = await organizationService.createOrganization(req.body, adminUserId);
      sendSuccess(res, org, 'Organization created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgs = await organizationService.getAllOrganizations();
      sendSuccess(res, orgs, 'Organizations retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await organizationService.getOrganizationById(req.params.id);
      sendSuccess(res, org, 'Organization details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateOrganizationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const org = await organizationService.updateStatus(req.params.id, req.body.status, adminUserId);
      sendSuccess(res, org, 'Organization status updated');
    } catch (error) {
      next(error);
    }
  }

  async updateOrganizationPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const org = await organizationService.updatePolicy(req.params.id, req.body.bpPolicy, adminUserId);
      sendSuccess(res, org, 'Organization BP policy updated');
    } catch (error) {
      next(error);
    }
  }

  async purchaseBP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { organizationId } = req.params;
      const { quantity, reference, description } = req.body;

      const result = await bpService.purchaseBP(
        organizationId,
        quantity,
        reference,
        description,
        adminUserId,
      );

      sendSuccess(res, result, 'Brownie Points purchased successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationBPAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const data = await bpService.getAccountAndTransactions(organizationId);
      sendSuccess(res, data, 'BP account and ledger retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createHrManager(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const hr = await hrService.createHrManager(req.body, adminUserId);
      sendSuccess(res, hr, 'HR Manager created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getHrManagers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const hrManagers = await hrService.getHrManagers(organizationId);
      sendSuccess(res, hrManagers, 'HR Managers retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
