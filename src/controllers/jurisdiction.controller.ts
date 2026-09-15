import { Request, Response, NextFunction } from 'express';
import { countryRepository } from '../repositories/country.repository';
import { jurisdictionPolicyRepository } from '../repositories/jurisdictionPolicy.repository';
import { jurisdictionPolicyService } from '../services/jurisdictionPolicy.service';
import { organizationService } from '../services/organization.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class JurisdictionController {
  async getCountries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const countries = await countryRepository.findAllActive();
      sendSuccess(res, countries, 'Active reference countries retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getAllPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policies = await jurisdictionPolicyRepository.findAll();
      sendSuccess(res, policies, 'Jurisdiction policies retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getPolicyByCountry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { countryCode } = req.params;
      const policy = await jurisdictionPolicyService.resolvePolicy(countryCode);
      sendSuccess(res, policy, `Jurisdiction policy for ${countryCode.toUpperCase()} retrieved`);
    } catch (error) {
      next(error);
    }
  }

  async updatePolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminUserId = req.user!.userId;
      const updated = await jurisdictionPolicyService.updatePolicy(id, req.body, adminUserId);
      sendSuccess(res, updated, 'Jurisdiction policy updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async createPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const { countryCode, reason, ...fields } = req.body;

      const code = countryCode.toUpperCase();
      await jurisdictionPolicyService.validateOrganizationJurisdiction(code);

      const latestVersion = await jurisdictionPolicyRepository.getLatestVersion(code);
      const newVersion = fields.policyVersion || latestVersion + 1;

      const policy = await jurisdictionPolicyRepository.create({
        country: { connect: { code } },
        policyVersion: newVersion,
        ...fields,
      });

      sendSuccess(res, policy, `Policy version ${newVersion} created for ${code}`, 201);
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationJurisdiction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.params.organizationId || req.user?.organizationId;
      if (!organizationId) {
        throw new AppError('Organization ID is required', 400);
      }

      const policy = await jurisdictionPolicyService.getPolicyForOrganization(organizationId);
      const org = await organizationService.getOrganizationById(organizationId);

      sendSuccess(
        res,
        {
          organization: {
            id: org.id,
            name: org.name,
            countryCode: org.countryCode,
            countryName: org.countryName,
            appliedPolicyVersion: org.jurisdictionPolicyVersion,
          },
          jurisdictionPolicy: policy,
        },
        'Organization jurisdiction configuration retrieved',
      );
    } catch (error) {
      next(error);
    }
  }

  async changeOrganizationCountry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { countryCode, reason } = req.body;
      const adminUserId = req.user!.userId;

      const updated = await organizationService.changeCountry(
        id,
        countryCode,
        adminUserId,
        reason,
      );

      sendSuccess(res, updated, `Organization jurisdiction changed to ${updated.countryName} (${updated.countryCode})`);
    } catch (error) {
      next(error);
    }
  }

  // --- Feature Guard Demonstration Endpoints ---
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { leaderboard: [] }, 'Leaderboard access authorized under current jurisdiction policy');
  }

  async getPublicProfiles(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { publicProfiles: [] }, 'Public profiles access authorized under current jurisdiction policy');
  }

  async requestPortability(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { status: 'PORTABILITY_INITIATED' }, 'Portability request authorized under current jurisdiction policy');
  }

  async requestRedemption(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { status: 'REDEMPTION_AUTHORIZED' }, 'Redemption authorized under current jurisdiction policy');
  }
}

export const jurisdictionController = new JurisdictionController();
