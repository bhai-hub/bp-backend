import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema } from '../validators/auth.validator';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User Login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user info
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', validateRequest(loginSchema), (req, res, next) =>
  authController.login(req, res, next),
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/auth/me', authenticateToken, (req, res, next) =>
  authController.getMe(req, res, next),
);

export default router;
