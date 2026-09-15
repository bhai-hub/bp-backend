import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import hrRoutes from './hr.routes';
import employeeRoutes from './employee.routes';
import jurisdictionRoutes from './jurisdiction.routes';
import onboardingRoutes from './onboarding.routes';
import ikigaiRoutes from './ikigai.routes';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(adminRoutes);
router.use(hrRoutes);
router.use(employeeRoutes);
router.use(jurisdictionRoutes);
router.use(onboardingRoutes);
router.use(ikigaiRoutes);

export default router;
