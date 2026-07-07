import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getOrders(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = '1',
      limit = '10',
      marketplace,
      status,
      search = '',
      from,
      to,
    } = req.query;

    const p = parseInt(page as string, 10);
    const l = parseInt(limit as string, 10);
    const skip = (p - 1) * l;

    const whereClause: any = {
      userId: req.userId,
    };

    if (marketplace) {
      whereClause.marketplace = marketplace as string;
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (search) {
      whereClause.OR = [
        { marketplaceOrderId: { contains: search as string } },
        { sku: { contains: search as string } },
        { productName: { contains: search as string } },
      ];
    }

    if (from || to) {
      whereClause.orderDate = {};
      if (from) {
        whereClause.orderDate.gte = new Date(from as string);
      }
      if (to) {
        whereClause.orderDate.lte = new Date(to as string);
      }
    }

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: l,
        orderBy: { orderDate: 'desc' },
        include: {
          product: {
            select: {
              costPrice: true,
            },
          },
        },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      orders,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching orders' });
  }
}

export async function getOrderById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        product: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching order' });
  }
}

export async function getOrderSummary(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from, to } = req.query;

    const whereClause: any = {
      userId: req.userId,
    };

    if (from || to) {
      whereClause.orderDate = {};
      if (from) {
        whereClause.orderDate.gte = new Date(from as string);
      }
      if (to) {
        whereClause.orderDate.lte = new Date(to as string);
      }
    }

    // Retrieve all orders inside time window
    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        marketplace: true,
        salePrice: true,
        totalFees: true,
        profit: true,
        quantity: true,
      },
    });

    let totalRevenue = 0;
    let totalFees = 0;
    let totalProfit = 0;
    let profitCount = 0;
    const orderCount = orders.length;

    // Platform specific breakdowns
    const platformBreakdown: Record<string, { revenue: number; profit: number; orders: number }> = {
      AMAZON: { revenue: 0, profit: 0, orders: 0 },
      FLIPKART: { revenue: 0, profit: 0, orders: 0 },
      MEESHO: { revenue: 0, profit: 0, orders: 0 },
    };

    for (const order of orders) {
      const price = order.salePrice;
      const fees = order.totalFees;
      const qty = order.quantity;

      totalRevenue += price;
      totalFees += fees;

      if (order.profit !== null) {
        totalProfit += order.profit;
        profitCount++;
      }

      const market = order.marketplace;
      if (platformBreakdown[market]) {
        platformBreakdown[market].revenue += price;
        platformBreakdown[market].orders++;
        if (order.profit !== null) {
          platformBreakdown[market].profit += order.profit;
        }
      }
    }

    // Retrieve global expenses in this period to subtract from net profit
    const expenseWhereClause: any = { userId: req.userId };
    if (from || to) {
      expenseWhereClause.date = {};
      if (from) expenseWhereClause.date.gte = new Date(from as string);
      if (to) expenseWhereClause.date.lte = new Date(to as string);
    }

    const expensesSum = await prisma.expense.aggregate({
      where: expenseWhereClause,
      _sum: {
        amount: true,
      },
    });

    const totalExpenses = expensesSum._sum.amount || 0;
    const finalNetProfit = totalProfit - totalExpenses;

    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
    const profitMargin = totalRevenue > 0 ? (finalNetProfit / totalRevenue) * 100 : 0;

    return res.status(200).json({
      summary: {
        totalRevenue,
        totalFees,
        totalProfit: finalNetProfit,
        totalExpenses,
        orderCount,
        aov,
        profitMargin,
      },
      platformBreakdown,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error compiling order summary' });
  }
}
