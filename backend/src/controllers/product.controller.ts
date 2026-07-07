import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { backfillOrderProfits } from '../services/calculation.service';

export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = '1', limit = '10', search = '', marketplace } = req.query;
    const p = parseInt(page as string, 10);
    const l = parseInt(limit as string, 10);
    const skip = (p - 1) * l;

    const whereClause: any = {
      userId: req.userId,
    };

    if (marketplace) {
      whereClause.marketplace = marketplace as string;
    }

    if (search) {
      whereClause.OR = [
        { sku: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      products,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching products' });
  }
}

export async function getProductById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching product' });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sku, name, costPrice, sellingPrice, category, marketplace, marketplaceSku } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!marketplace || !['AMAZON', 'FLIPKART', 'MEESHO'].includes(marketplace)) {
      return res.status(400).json({ error: 'Valid marketplace (AMAZON, FLIPKART, MEESHO) is required' });
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        userId: req.userId,
        sku,
        marketplace,
      },
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this SKU already exists for this marketplace.' });
    }

    const product = await prisma.product.create({
      data: {
        userId: req.userId,
        sku,
        name,
        costPrice: costPrice !== undefined ? costPrice : null,
        sellingPrice: sellingPrice !== undefined ? sellingPrice : null,
        category: category || null,
        marketplace,
        marketplaceSku: marketplaceSku || null,
      },
    });

    // If cost price was provided, backfill profits for historic orders matching this SKU/marketplace
    if (product.costPrice !== null) {
      await backfillOrderProfits(req.userId, product.sku, product.marketplace, product.costPrice);
    }

    return res.status(201).json(product);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error creating product' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, costPrice, sellingPrice, category, marketplaceSku } = req.body;

    const currentProduct = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: name !== undefined ? name : currentProduct.name,
        costPrice: costPrice !== undefined ? costPrice : currentProduct.costPrice,
        sellingPrice: sellingPrice !== undefined ? sellingPrice : currentProduct.sellingPrice,
        category: category !== undefined ? category : currentProduct.category,
        marketplaceSku: marketplaceSku !== undefined ? marketplaceSku : currentProduct.marketplaceSku,
      },
    });

    // If costPrice was updated and is different, trigger a historical backfill
    if (costPrice !== undefined && costPrice !== currentProduct.costPrice) {
      if (costPrice !== null) {
        await backfillOrderProfits(
          req.userId,
          updatedProduct.sku,
          updatedProduct.marketplace,
          costPrice
        );
      } else {
        // If set to null, reset profits on matching orders
        await prisma.order.updateMany({
          where: {
            userId: req.userId,
            sku: updatedProduct.sku,
            marketplace: updatedProduct.marketplace,
          },
          data: {
            costPrice: null,
            profit: null,
          },
        });
      }
    }

    return res.status(200).json(updatedProduct);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating product' });
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error deleting product' });
  }
}
