import { Router } from 'express';
import { onboardingController } from '../controllers/onboarding.controller';
import { authenticateToken } from '../middleware/authenticateToken';
import { authorizeRoles } from '../middleware/authorizeRoles';
import { validateRequest } from '../middleware/validateRequest';
import {
  validateTokenSchema,
  acceptInvitationSchema,
  completeProfileSchema,
  resendInvitationSchema,
} from '../validators/onboarding.validator';

const router = Router();

// 1. Public Invitation Verification
router.get(
  '/onboarding/invitation/:token',
  validateRequest(validateTokenSchema),
  (req, res, next) => onboardingController.validateInvitation(req, res, next),
);

// 2. Public Invitation Acceptance & Password Creation
router.post(
  '/onboarding/invitation/accept',
  validateRequest(acceptInvitationSchema),
  (req, res, next) => onboardingController.acceptInvitation(req, res, next),
);

// 3. Authenticated Employee Profile Completion
router.post(
  '/onboarding/profile',
  authenticateToken,
  authorizeRoles('EMPLOYEE'),
  validateRequest(completeProfileSchema),
  (req, res, next) => onboardingController.completeProfile(req, res, next),
);

// 4. Authenticated Employee Onboarding Status
router.get(
  '/onboarding/status',
  authenticateToken,
  authorizeRoles('EMPLOYEE'),
  (req, res, next) => onboardingController.getStatus(req, res, next),
);

// 5. HR Resend Invitation
router.post(
  '/hr/employees/:id/resend-invitation',
  authenticateToken,
  authorizeRoles('HR_MANAGER'),
  validateRequest(resendInvitationSchema),
  (req, res, next) => onboardingController.resendInvitation(req, res, next),
);

export default router;
