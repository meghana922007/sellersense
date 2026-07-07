import { Router } from 'express';
import { uploadReport, getImportHistory, getImportStatus } from '../controllers/import.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/upload', authenticate, upload.single('file'), uploadReport);
router.get('/history', authenticate, getImportHistory);
router.get('/status/:jobId', authenticate, getImportStatus);

export default router;
