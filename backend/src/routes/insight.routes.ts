import { Router } from 'express';
import { getDashboardBullets, generateDeepAnalysis } from '../controllers/insight.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', authenticate, getDashboardBullets);
router.post('/generate', authenticate, generateDeepAnalysis);

export default router;
