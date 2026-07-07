import PDFDocument from 'pdfkit';
import prisma from '../config/database';

export async function generatePdfReport(
  userId: string,
  from?: string,
  to?: string
): Promise<PDFKit.PDFDocument> {
  const whereClause: any = { userId };
  const expenseWhereClause: any = { userId };

  if (from || to) {
    whereClause.orderDate = {};
    expenseWhereClause.date = {};
    if (from) {
      whereClause.orderDate.gte = new Date(from);
      expenseWhereClause.date.gte = new Date(from);
    }
    if (to) {
      whereClause.orderDate.lte = new Date(to);
      expenseWhereClause.date.lte = new Date(to);
    }
  }

  // Fetch data
  const user = await prisma.user.findUnique({ where: { id: userId } });
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

  const expenses = await prisma.expense.aggregate({
    where: expenseWhereClause,
    _sum: {
      amount: true,
    },
  });

  // Calculate stats
  let totalRevenue = 0;
  let totalFees = 0;
  let totalProfit = 0;
  const orderCount = orders.length;

  const platformBreakdown: Record<string, { revenue: number; profit: number; orders: number }> = {
    AMAZON: { revenue: 0, profit: 0, orders: 0 },
    FLIPKART: { revenue: 0, profit: 0, orders: 0 },
    MEESHO: { revenue: 0, profit: 0, orders: 0 },
  };

  for (const order of orders) {
    totalRevenue += order.salePrice;
    totalFees += order.totalFees;
    if (order.profit !== null) {
      totalProfit += order.profit;
    }

    const market = order.marketplace;
    if (platformBreakdown[market]) {
      platformBreakdown[market].revenue += order.salePrice;
      platformBreakdown[market].orders++;
      if (order.profit !== null) {
        platformBreakdown[market].profit += order.profit;
      }
    }
  }

  const totalExpenses = expenses._sum.amount || 0;
  const finalProfit = totalProfit - totalExpenses;
  const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
  const margin = totalRevenue > 0 ? (finalProfit / totalRevenue) * 100 : 0;

  // Initialize PDFKit document
  const doc = new PDFDocument({ margin: 50 });

  // 1. Header Section
  doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('SellerSense Business Report', { align: 'left' });
  doc.moveDown(0.2);
  doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`);
  doc.text(`Store Name: ${user?.storeName || 'My Seller Store'} | Email: ${user?.email}`);
  
  if (from || to) {
    doc.text(`Timeframe: ${from ? new Date(from).toLocaleDateString('en-IN') : 'Start'} to ${to ? new Date(to).toLocaleDateString('en-IN') : 'Present'}`);
  }

  doc.moveDown(1.5);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1.5);

  // 2. Metrics Summary Box
  doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Financial Highlights');
  doc.moveDown(0.8);

  const startY = doc.y;
  
  // Column 1: Gross Sales & Net Profit
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b').text('GROSS SALES', 70, startY);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#3b62f6').text(`INR ${totalRevenue.toLocaleString()}`, 70, startY + 15);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b').text('NET PROFIT', 230, startY);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#22c55e').text(`INR ${finalProfit.toLocaleString()}`, 230, startY + 15);

  // Column 2: Orders Count & Margin
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b').text('TOTAL ORDERS', 390, startY);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text(`${orderCount}`, 390, startY + 15);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b').text('PROFIT MARGIN', 70, startY + 55);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text(`${margin.toFixed(1)}%`, 70, startY + 70);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b').text('TOTAL EXPENSES', 230, startY + 55);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#ef4444').text(`INR ${totalExpenses.toLocaleString()}`, 230, startY + 70);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b').text('AVERAGE ORDER VALUE', 390, startY + 55);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text(`INR ${aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 390, startY + 70);

  doc.moveDown(6);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1.5);

  // 3. Platform breakdown Table
  doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Platform Breakdown', 50);
  doc.moveDown(0.8);

  const tableTop = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b');
  doc.text('Sales Channel', 60, tableTop);
  doc.text('Revenue', 200, tableTop, { width: 100, align: 'right' });
  doc.text('Net Profit', 320, tableTop, { width: 100, align: 'right' });
  doc.text('Order Volume', 440, tableTop, { width: 100, align: 'right' });

  doc.moveDown(0.5);
  doc.strokeColor('#cbd5e1').lineWidth(1.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  let currentY = doc.y;
  for (const platform of ['AMAZON', 'FLIPKART', 'MEESHO']) {
    const stat = platformBreakdown[platform];
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(platform, 60, currentY + 5);
    doc.font('Helvetica').text(`INR ${stat.revenue.toLocaleString()}`, 200, currentY + 5, { width: 100, align: 'right' });
    doc.text(`INR ${stat.profit.toLocaleString()}`, 320, currentY + 5, { width: 100, align: 'right' });
    doc.text(`${stat.orders}`, 440, currentY + 5, { width: 100, align: 'right' });

    currentY += 25;
    doc.strokeColor('#f1f5f9').lineWidth(1).moveTo(50, currentY).lineTo(550, currentY).stroke();
  }

  doc.moveDown(2);
  doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Oblique').text('Disclaimer: This automated report consolidates uploaded sales logs. Verify metrics with official marketplace portals.', 50, currentY + 40, { align: 'center' });

  doc.end();
  return doc;
}
