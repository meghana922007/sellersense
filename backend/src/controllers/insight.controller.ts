import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDashboardInsights, getDetailedInsights } from '../services/ai.service';

export async function getDashboardBullets(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bullets = await getDashboardInsights(req.userId);
    return res.status(200).json({ insights: bullets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error generating dashboard insights' });
  }
}

export async function generateDeepAnalysis(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from, to } = req.body;

    const report = await getDetailedInsights(req.userId, from as string, to as string);
    return res.status(200).json({ report });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error compiling deep analysis' });
  }
}
