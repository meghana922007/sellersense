import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { generatePdfReport } from '../services/report.service';
import prisma from '../config/database';

export async function downloadSalesPdf(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from, to } = req.query;

    const doc = await generatePdfReport(req.userId, from as string, to as string);

    // Set HTTP headers for file stream download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=SellerSense_Report.pdf');

    doc.pipe(res);
  } catch (error: any) {
    console.error('Failed to generate PDF:', error);
    return res.status(500).json({ error: error.message || 'Error occurred during PDF generation' });
  }
}

export async function downloadSalesCsv(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from, to } = req.query;

    const whereClause: any = { userId: req.userId };
    if (from || to) {
      whereClause.orderDate = {};
      if (from) whereClause.orderDate.gte = new Date(from as string);
      if (to) whereClause.orderDate.lte = new Date(to as string);
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { orderDate: 'desc' },
      select: {
        marketplaceOrderId: true,
        orderDate: true,
        marketplace: true,
        sku: true,
        productName: true,
        quantity: true,
        salePrice: true,
        totalFees: true,
        costPrice: true,
        profit: true,
      },
    });

    // Generate plain-text CSV format
    let csvContent = 'Order ID,Date,Marketplace,SKU,Product Name,Quantity,Sale Price,Fees,COGS,Profit\n';
    
    for (const o of orders) {
      const date = new Date(o.orderDate).toISOString().split('T')[0];
      const name = o.productName.replace(/"/g, '""'); // Escaped quotes
      const cogs = o.costPrice !== null ? (o.costPrice * o.quantity) : 0;
      const profit = o.profit !== null ? o.profit : '';
      csvContent += `"${o.marketplaceOrderId}",${date},${o.marketplace},"${o.sku}","${name}",${o.quantity},${o.salePrice},${o.totalFees},${cogs},${profit}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=SellerSense_Report.csv');
    return res.status(200).send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error occurred during CSV generation' });
  }
}

export async function triggerTestEmail(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Load dynamic SMTP and dispatch
    const { sendWeeklyReportEmail } = require('../services/email.service');
    await sendWeeklyReportEmail(req.userId, user.email);

    return res.status(200).json({ message: 'Test email successfully triggered.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error triggering test report' });
  }
}
