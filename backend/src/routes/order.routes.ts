import { Router } from 'express';
import { getOrders, getOrderById, getOrderSummary } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getOrders);
router.get('/summary', authenticate, getOrderSummary);
router.get('/:id', authenticate, getOrderById);

export default router;
