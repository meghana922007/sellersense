import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getInventory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = '1', limit = '10', alert } = req.query;
    const p = parseInt(page as string, 10);
    const l = parseInt(limit as string, 10);
    const skip = (p - 1) * l;

    const whereClause: any = {
      userId: req.userId,
    };

    const items = await prisma.inventory.findMany({
      where: whereClause,
      orderBy: { sku: 'asc' },
      include: {
        product: {
          select: {
            name: true,
            costPrice: true,
          },
        },
      },
    });

    // If alert parameter is set, filter items below threshold
    let filteredItems = items;
    if (alert === 'true') {
      filteredItems = items.filter(
        (item) => item.fulfillableQuantity <= item.lowStockThreshold
      );
    }

    // Paging handled manually after possible client-side filtering
    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(skip, skip + l);

    return res.status(200).json({
      inventory: paginatedItems,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching inventory logs' });
  }
}

export async function updateLowStockThreshold(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { threshold } = req.body;
    const parsedThreshold = parseInt(threshold, 10);

    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ error: 'Low stock threshold must be a non-negative number' });
    }

    const currentItem = await prisma.inventory.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!currentItem) {
      return res.status(404).json({ error: 'Inventory log not found' });
    }

    const updatedItem = await prisma.inventory.update({
      where: { id: req.params.id },
      data: {
        lowStockThreshold: parsedThreshold,
      },
    });

    return res.status(200).json(updatedItem);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating stock alert threshold' });
  }
}
