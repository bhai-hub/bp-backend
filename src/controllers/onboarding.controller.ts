import { Request, Response, NextFunction } from 'express';
import { onboardingService } from '../services/onboarding.service';
import { sendSuccess } from '../utils/response';

export class OnboardingController {
  async validateInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const preview = await onboardingService.validateInvitation(token);
      sendSuccess(res, preview, 'Invitation token verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      const result = await onboardingService.acceptInvitation(token, password);
      sendSuccess(res, result, 'Invitation accepted. Account activated successfully.');
    } catch (error) {
      next(error);
    }
  }

  async completeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await onboardingService.completeProfile(userId, req.body);
      sendSuccess(res, result, 'Employee profile completed successfully. Proceed to Ikigai questionnaire.');
    } catch (error) {
      next(error);
    }
  }

  async resendInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hrUser = {
        userId: req.user!.userId,
        organizationId: req.user!.organizationId,
      };
      const { id } = req.params;
      const result = await onboardingService.resendInvitation(hrUser, id);
      sendSuccess(res, result, 'Onboarding invitation resent successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = await onboardingService.getOnboardingStatus(userId);
      sendSuccess(res, status, 'Employee onboarding status retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const onboardingController = new OnboardingController();
export default onboardingController;
