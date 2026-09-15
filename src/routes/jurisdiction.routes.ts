import { Router } from 'express';
import { jurisdictionController } from '../controllers/jurisdiction.controller';
import { authenticateToken } from '../middleware/authenticateToken';
import { authorizeRoles } from '../middleware/authorizeRoles';
import { validateRequest } from '../middleware/validateRequest';
import { requireJurisdictionFeature } from '../middleware/requireJurisdictionFeature';
import {
  updateJurisdictionPolicySchema,
  changeOrganizationCountrySchema,
  createJurisdictionPolicySchema,
} from '../validators/jurisdiction.validator';

const router = Router();

// 1. Countries reference list (Accessible to all authenticated or public)
router.get('/countries', (req, res, next) => jurisdictionController.getCountries(req, res, next));

// 2. Organization Jurisdiction details
router.get(
  '/organizations/:organizationId/jurisdiction',
  authenticateToken,
  (req, res, next) => jurisdictionController.getOrganizationJurisdiction(req, res, next),
);

// 3. Super Admin Policy Management
router.get(
  '/admin/policies',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  (req, res, next) => jurisdictionController.getAllPolicies(req, res, next),
);

router.get(
  '/admin/policies/:countryCode',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  (req, res, next) => jurisdictionController.getPolicyByCountry(req, res, next),
);

router.post(
  '/admin/policies',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  validateRequest(createJurisdictionPolicySchema),
  (req, res, next) => jurisdictionController.createPolicy(req, res, next),
);

router.patch(
  '/admin/policies/:id',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  validateRequest(updateJurisdictionPolicySchema),
  (req, res, next) => jurisdictionController.updatePolicy(req, res, next),
);

// 4. Change Organization Country
router.patch(
  '/admin/organizations/:id/country',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN'),
  validateRequest(changeOrganizationCountrySchema),
  (req, res, next) => jurisdictionController.changeOrganizationCountry(req, res, next),
);

// 5. Feature Guard Demonstration Endpoints
router.get(
  '/organizations/:organizationId/leaderboard',
  authenticateToken,
  requireJurisdictionFeature('LEADERBOARD'),
  (req, res) => jurisdictionController.getLeaderboard(req, res),
);

router.get(
  '/organizations/:organizationId/public-profiles',
  authenticateToken,
  requireJurisdictionFeature('PUBLIC_PROFILE'),
  (req, res) => jurisdictionController.getPublicProfiles(req, res),
);

router.post(
  '/organizations/:organizationId/portability',
  authenticateToken,
  requireJurisdictionFeature('PORTABILITY'),
  (req, res) => jurisdictionController.requestPortability(req, res),
);

router.post(
  '/organizations/:organizationId/redemption',
  authenticateToken,
  requireJurisdictionFeature('REDEMPTION'),
  (req, res) => jurisdictionController.requestRedemption(req, res),
);

export default router;
