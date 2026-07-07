import { Router } from 'express';
import { getMarketplaces, updateMarketplaces } from '../controllers/marketplace.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getMarketplaces);
router.put('/', authenticate, updateMarketplaces);

export default router;
