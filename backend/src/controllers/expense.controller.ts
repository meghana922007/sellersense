import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getExpenses(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = '1', limit = '10', category, from, to } = req.query;
    const p = parseInt(page as string, 10);
    const l = parseInt(limit as string, 10);
    const skip = (p - 1) * l;

    const whereClause: any = {
      userId: req.userId,
    };

    if (category) {
      whereClause.category = category as string;
    }

    if (from || to) {
      whereClause.date = {};
      if (from) {
        whereClause.date.gte = new Date(from as string);
      }
      if (to) {
        whereClause.date.lte = new Date(to as string);
      }
    }

    const [expenses, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where: whereClause,
        skip,
        take: l,
        orderBy: { date: 'desc' },
      }),
      prisma.expense.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      expenses,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching expenses' });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category, amount, description, date, isRecurring } = req.body;

    if (!category || !['PACKAGING', 'TRANSPORT', 'ADVERTISING', 'MISC'].includes(category)) {
      return res.status(400).json({ error: 'Valid category (PACKAGING, TRANSPORT, ADVERTISING, MISC) is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId: req.userId,
        category,
        amount: parsedAmount,
        description: description || null,
        date: expenseDate,
        isRecurring: !!isRecurring,
      },
    });

    return res.status(201).json(expense);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error creating expense' });
  }
}

export async function deleteExpense(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.expense.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error deleting expense' });
  }
}
