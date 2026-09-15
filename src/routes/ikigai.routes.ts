import { Router } from 'express';
import { ikigaiController } from '../controllers/ikigai.controller';
import { authenticateToken } from '../middleware/authenticateToken';
import { authorizeRoles } from '../middleware/authorizeRoles';
import { validateRequest } from '../middleware/validateRequest';
import {
  submitIkigaiResponsesSchema,
  updateIkigaiResponsesSchema,
} from '../validators/ikigai.validator';

const router = Router();

// All Ikigai routes require authentication as an EMPLOYEE
router.use('/ikigai', authenticateToken, authorizeRoles('EMPLOYEE'));

// 1. Get current active questionnaire
router.get('/ikigai/questionnaire/current', (req, res, next) =>
  ikigaiController.getCurrentQuestionnaire(req, res, next),
);

// 2. Get current employee reflections
router.get('/ikigai/me', (req, res, next) =>
  ikigaiController.getMyResponses(req, res, next),
);

// 3. Submit questionnaire responses during onboarding
router.post(
  '/ikigai/responses',
  validateRequest(submitIkigaiResponsesSchema),
  (req, res, next) => ikigaiController.submitResponses(req, res, next),
);

// 4. Update reflections post-onboarding
router.put(
  '/ikigai/responses',
  validateRequest(updateIkigaiResponsesSchema),
  (req, res, next) => ikigaiController.updateResponses(req, res, next),
);

// 5. Completion & progress status
router.get('/ikigai/status', (req, res, next) =>
  ikigaiController.getStatus(req, res, next),
);

export default router;
