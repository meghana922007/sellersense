import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { processFileImport } from '../services/import.service';

export async function uploadReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;

    // Create a pending job
    const job = await prisma.importJob.create({
      data: {
        userId: req.userId,
        marketplace: 'AMAZON', // Will be overwritten by auto-detection
        fileName: file.originalname,
        fileType: file.filename.split('.').pop() || 'csv',
        status: 'PENDING',
      },
    });

    // Fire-and-forget background execution to prevent HTTP timeouts
    processFileImport(req.userId, file.path, job.id)
      .then(async (result) => {
        await prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            marketplace: result.marketplace,
            processedRows: result.processedCount,
            completedAt: new Date(),
          },
        });
      })
      .catch(async (error: any) => {
        console.error(`Import Job #${job.id} failed:`, error);
        await prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message || 'Unknown parsing exception occurred.',
            completedAt: new Date(),
          },
        });
      });

    return res.status(202).json({
      message: 'File upload accepted. Processing started in the background.',
      jobId: job.id,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error uploading file' });
  }
}

export async function getImportHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = '1', limit = '10' } = req.query;
    const p = parseInt(page as string, 10);
    const l = parseInt(limit as string, 10);
    const skip = (p - 1) * l;

    const [imports, total] = await prisma.$transaction([
      prisma.importJob.findMany({
        where: { userId: req.userId },
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.importJob.count({
        where: { userId: req.userId },
      }),
    ]);

    return res.status(200).json({
      imports,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching import history' });
  }
}

export async function getImportStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const job = await prisma.importJob.findFirst({
      where: {
        id: req.params.jobId,
        userId: req.userId,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    return res.status(200).json(job);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching import status' });
  }
}
