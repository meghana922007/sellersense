import { Router } from 'express';
import { downloadSalesPdf, downloadSalesCsv, triggerTestEmail } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/sales/pdf', authenticate, downloadSalesPdf);
router.get('/sales/csv', authenticate, downloadSalesCsv);
router.post('/email/test', authenticate, triggerTestEmail);

export default router;
