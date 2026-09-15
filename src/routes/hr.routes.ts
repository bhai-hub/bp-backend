import { Router } from 'express';
import { hrController } from '../controllers/hr.controller';
import { authenticateToken } from '../middleware/authenticateToken';
import { authorizeRoles } from '../middleware/authorizeRoles';
import { validateRequest } from '../middleware/validateRequest';
import {
  createEmployeeSchema,
  bpCreditSchema,
  updateEmployeeStatusSchema,
} from '../validators/hr.validator';

const router = Router();

// Scope HR protection specifically to /hr routes
router.use('/hr', authenticateToken, authorizeRoles('HR_MANAGER'));

router.get('/hr/dashboard', (req, res, next) => hrController.getDashboard(req, res, next));

router.get('/hr/organization', (req, res, next) => hrController.getOrganization(req, res, next));

router.post(
  '/hr/employees',
  validateRequest(createEmployeeSchema),
  (req, res, next) => hrController.createEmployee(req, res, next),
);

router.get('/hr/employees', (req, res, next) => hrController.getEmployees(req, res, next));

router.patch(
  '/hr/employees/:id/status',
  validateRequest(updateEmployeeStatusSchema),
  (req, res, next) => hrController.updateEmployeeStatus(req, res, next),
);

router.post(
  '/hr/employees/:employeeId/bp-credit',
  validateRequest(bpCreditSchema),
  (req, res, next) => hrController.creditBP(req, res, next),
);

router.get('/hr/bp-activity', (req, res, next) => hrController.getBPActivity(req, res, next));

export default router;
