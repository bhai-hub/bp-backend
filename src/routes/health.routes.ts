import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: API Health Check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Brownie Points API is running
 */
router.get('/health', (req, res) => healthController.check(req, res));

export default router;
