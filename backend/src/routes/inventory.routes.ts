import { Router } from 'express';
import { getInventory, updateLowStockThreshold } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getInventory);
router.put('/:id/threshold', authenticate, updateLowStockThreshold);

export default router;
