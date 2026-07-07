import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getMarketplaces(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const marketplaces = await prisma.userMarketplace.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        marketplace: true,
        isActive: true,
      },
    });

    return res.status(200).json(marketplaces);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching marketplaces' });
  }
}

export async function updateMarketplaces(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { marketplaces } = req.body;

    if (!marketplaces || !Array.isArray(marketplaces)) {
      return res.status(400).json({ error: 'Marketplaces list must be an array' });
    }

    // Update in transaction
    const updates = marketplaces.map((m: any) => {
      if (!m.marketplace || m.isActive === undefined) {
        throw new Error('Invalid marketplace parameter object.');
      }
      return prisma.userMarketplace.upsert({
        where: {
          userId_marketplace: {
            userId: req.userId!,
            marketplace: m.marketplace,
          },
        },
        update: { isActive: !!m.isActive },
        create: {
          userId: req.userId!,
          marketplace: m.marketplace,
          isActive: !!m.isActive,
        },
      });
    });

    await prisma.$transaction(updates);

    const updatedMarketplaces = await prisma.userMarketplace.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        marketplace: true,
        isActive: true,
      },
    });

    return res.status(200).json(updatedMarketplaces);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating marketplaces' });
  }
}
