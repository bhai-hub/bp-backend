import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { authenticateToken } from '../middleware/authenticateToken';
import { authorizeRoles } from '../middleware/authorizeRoles';
import { validateRequest } from '../middleware/validateRequest';
import { updateProfileSchema } from '../validators/employee.validator';

const router = Router();

// Scope Employee protection specifically to /employees routes
router.use('/employees', authenticateToken, authorizeRoles('EMPLOYEE'));

router.get('/employees/me', (req, res, next) => employeeController.getMe(req, res, next));

router.patch(
  '/employees/me',
  validateRequest(updateProfileSchema),
  (req, res, next) => employeeController.updateMe(req, res, next),
);

router.get('/employees/me/wallet', (req, res, next) =>
  employeeController.getWallet(req, res, next),
);

router.get('/employees/me/activity', (req, res, next) =>
  employeeController.getActivity(req, res, next),
);

export default router;
