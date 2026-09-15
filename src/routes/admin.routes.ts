import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/authenticateToken';
import { authorizeRoles } from '../middleware/authorizeRoles';
import { validateRequest } from '../middleware/validateRequest';
import {
  createOrganizationSchema,
  updateOrgStatusSchema,
  updateOrgPolicySchema,
  bpPurchaseSchema,
  createHrManagerSchema,
} from '../validators/admin.validator';

const router = Router();

// Scope admin protection specifically to /admin routes
router.use('/admin', authenticateToken, authorizeRoles('SUPER_ADMIN'));

router.get('/admin/dashboard', (req, res, next) => adminController.getDashboard(req, res, next));

router.post(
  '/admin/organizations',
  validateRequest(createOrganizationSchema),
  (req, res, next) => adminController.createOrganization(req, res, next),
);

router.get('/admin/organizations', (req, res, next) =>
  adminController.getOrganizations(req, res, next),
);

router.get('/admin/organizations/:id', (req, res, next) =>
  adminController.getOrganizationById(req, res, next),
);

router.patch(
  '/admin/organizations/:id/status',
  validateRequest(updateOrgStatusSchema),
  (req, res, next) => adminController.updateOrganizationStatus(req, res, next),
);

router.patch(
  '/admin/organizations/:id/policy',
  validateRequest(updateOrgPolicySchema),
  (req, res, next) => adminController.updateOrganizationPolicy(req, res, next),
);

router.post(
  '/admin/organizations/:organizationId/bp-purchases',
  validateRequest(bpPurchaseSchema),
  (req, res, next) => adminController.purchaseBP(req, res, next),
);

router.get('/admin/organizations/:organizationId/bp-account', (req, res, next) =>
  adminController.getOrganizationBPAccount(req, res, next),
);

router.post(
  '/admin/hr-managers',
  validateRequest(createHrManagerSchema),
  (req, res, next) => adminController.createHrManager(req, res, next),
);

router.get('/admin/hr-managers', (req, res, next) =>
  adminController.getHrManagers(req, res, next),
);

export default router;
