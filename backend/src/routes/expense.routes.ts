import { Router } from 'express';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getExpenses);
router.post('/', authenticate, createExpense);
router.delete('/:id', authenticate, deleteExpense);

export default router;
