import { Request, Response, NextFunction } from 'express';
import { ikigaiService } from '../services/ikigai.service';
import { sendSuccess } from '../utils/response';

export class IkigaiController {
  async getCurrentQuestionnaire(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const questionnaire = await ikigaiService.getCurrentQuestionnaire();
      sendSuccess(res, questionnaire, 'Current Ikigai questionnaire retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getMyResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await ikigaiService.getEmployeeResponses(userId);
      sendSuccess(res, data, 'Employee Ikigai reflections retrieved');
    } catch (error) {
      next(error);
    }
  }

  async submitResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await ikigaiService.submitResponses(userId, req.body);
      sendSuccess(
        res,
        result,
        'Ikigai reflections submitted successfully. Onboarding completed!',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async updateResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await ikigaiService.updateResponses(userId, req.body);
      sendSuccess(res, result, 'Ikigai reflections updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = await ikigaiService.getStatus(userId);
      sendSuccess(res, status, 'Ikigai completion status retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const ikigaiController = new IkigaiController();
export default ikigaiController;
