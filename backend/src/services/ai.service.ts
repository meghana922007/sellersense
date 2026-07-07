import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/database';

// Initialize Google Generative AI client if key is present
const getGeminiClient = (): GoogleGenerativeAI | null => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith('your-gemini-key') || key === '...') {
    return null;
  }
  return new GoogleGenerativeAI(key);
};

/**
 * Computes deterministic statistics to provide either to Gemini
 * or to use in the fallback local analytical summary.
 */
async function fetchSellerStats(userId: string, fromDate?: string, toDate?: string) {
  const where: any = { userId };
  if (fromDate || toDate) {
    where.orderDate = {};
    if (fromDate) where.orderDate.gte = new Date(fromDate);
    if (toDate) where.orderDate.lte = new Date(toDate);
  }

  const [orders, products, expenses] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        marketplace: true,
        salePrice: true,
        profit: true,
        sku: true,
        quantity: true,
        productName: true,
      },
    }),
    prisma.product.findMany({ where: { userId }, select: { sku: true, costPrice: true, name: true } }),
    prisma.expense.findMany({ where: { userId }, select: { amount: true } }),
  ]);

  let totalRevenue = 0;
  let totalProfit = 0;
  const skuCounts: Record<string, { qty: number; revenue: number; name: string }> = {};
  const platformBreakdown: Record<string, { revenue: number; profit: number; orders: number }> = {
    AMAZON: { revenue: 0, profit: 0, orders: 0 },
    FLIPKART: { revenue: 0, profit: 0, orders: 0 },
    MEESHO: { revenue: 0, profit: 0, orders: 0 },
  };

  for (const o of orders) {
    totalRevenue += o.salePrice;
    if (o.profit !== null) totalProfit += o.profit;

    // Track SKU metrics
    if (!skuCounts[o.sku]) {
      const prodDetails = products.find(p => p.sku === o.sku);
      skuCounts[o.sku] = { qty: 0, revenue: 0, name: prodDetails?.name || o.productName };
    }
    skuCounts[o.sku].qty += o.quantity;
    skuCounts[o.sku].revenue += o.salePrice;

    // Track platform metrics
    const market = o.marketplace;
    if (platformBreakdown[market]) {
      platformBreakdown[market].revenue += o.salePrice;
      platformBreakdown[market].orders++;
      if (o.profit !== null) platformBreakdown[market].profit += o.profit;
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const finalProfit = totalProfit - totalExpenses;
  const missingCostCount = products.filter(p => p.costPrice === null || p.costPrice === 0).length;

  // Sort SKUs by sales volume
  const topProducts = Object.keys(skuCounts)
    .map(sku => ({ sku, ...skuCounts[sku] }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  return {
    totalRevenue,
    totalProfit: finalProfit,
    missingCostCount,
    topProducts,
    platformBreakdown,
  };
}

/**
 * Returns a brief 3-bullet analysis for the main dashboard.
 */
export async function getDashboardInsights(userId: string): Promise<string> {
  const stats = await fetchSellerStats(userId);
  const client = getGeminiClient();

  if (!client) {
    // Graceful local analytical fallback
    let topMarketplace = 'None';
    let topRev = -1;
    for (const key of Object.keys(stats.platformBreakdown)) {
      if (stats.platformBreakdown[key].revenue > topRev) {
        topRev = stats.platformBreakdown[key].revenue;
        topMarketplace = key;
      }
    }

    const healthScore = stats.totalRevenue > 0 ? Math.min(100, Math.max(0, Math.round((stats.totalProfit / stats.totalRevenue) * 200))) : 0;
    const bullets = [
      `📊 Business Health Score: ${healthScore}/100 (based on profit margin ratio)`,
      `🏆 Top Revenue Channel: ${topMarketplace} contributing ₹${topRev.toLocaleString()} gross sales`,
      stats.missingCostCount > 0
        ? `⚠️ Catalog Alert: ${stats.missingCostCount} products are missing unit cost prices, distorting profit stats.`
        : `✅ Catalog Status: All product costs are configured. Profit metrics are 100% accurate.`
    ];
    return bullets.join('\n');
  }

  try {
    const prompt = `You are SellerSense AI, an automated business advisor. Analyze this store status:
- Gross Revenue: INR ${stats.totalRevenue}
- Net Profit: INR ${stats.totalProfit}
- Missing Product Cost Prices: ${stats.missingCostCount} items
- Product sales count details: ${JSON.stringify(stats.topProducts)}
- Marketplaces summary: ${JSON.stringify(stats.platformBreakdown)}

Respond in exactly this format in 3 lines:
📊 Business Health: [score 0-100] [1-sentence explanation]
🏆 Platform Spotlight: [Highest channel and its percentage share]
⚠️ Operational Warning: [Identify the most critical catalog alert or negative profit SKU]
Keep each line under 15 words.`;

    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || 'Insights temporary unavailable.';
  } catch (error: any) {
    return `Analysis error: ${error.message}`;
  }
}

/**
 * Returns a detailed markdown consultation report.
 */
export async function getDetailedInsights(
  userId: string,
  from?: string,
  to?: string
): Promise<string> {
  const stats = await fetchSellerStats(userId, from, to);
  const client = getGeminiClient();

  if (!client) {
    // Generate styled deterministic Markdown fallback report
    let markdown = `## 📊 SellerSense Business Analysis (Rule-Based Analytics)\n\n`;
    markdown += `*Note: Connect a valid Google Gemini API key in your \`.env\` file to receive dynamic LLM-driven suggestions.*\n\n`;
    
    markdown += `### 1. Executive Summary\n`;
    const margin = stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0;
    markdown += `Gross sales in this period reached **₹${stats.totalRevenue.toLocaleString()}** yielding a net margin of **${margin.toFixed(1)}%**. `;
    if (margin > 25) {
      markdown += `Your business shows strong profitability. `;
    } else if (margin > 10) {
      markdown += `Your profitability is moderate. Consider raising item prices or decreasing shipping costs. `;
    } else {
      markdown += `Warning: Profit margins are thin. Investigate platform commission leakages immediately. `;
    }
    markdown += `\n\n`;

    markdown += `### 2. Platform Spotlight\n`;
    for (const key of Object.keys(stats.platformBreakdown)) {
      const p = stats.platformBreakdown[key];
      if (p.orders > 0) {
        markdown += `*   **${key}**: Generated **₹${p.revenue.toLocaleString()}** across **${p.orders}** orders (Net Profit: **₹${p.profit.toLocaleString()}**).\n`;
      }
    }
    markdown += `\n`;

    markdown += `### 3. Inventory & SKU Recommendations\n`;
    if (stats.topProducts.length > 0) {
      markdown += `Your top-selling products by order volume are:\n`;
      stats.topProducts.forEach((p, idx) => {
        markdown += `${idx + 1}. **SKU: ${p.sku}** (${p.name}) — Sold **${p.qty} units** generating ₹${p.revenue.toLocaleString()} sales.\n`;
      });
      markdown += `\nEnsure stock levels for **SKU: ${stats.topProducts[0].sku}** are monitored closely to prevent out-of-stock leakages.\n`;
    } else {
      markdown += `No sales transactions found in this period to compile SKU rankings.\n`;
    }

    return markdown;
  }

  try {
    const prompt = `You are a professional e-commerce consultant. Perform a deep audit on this seller's stats:
- Gross Revenue: INR ${stats.totalRevenue}
- Net Profit: INR ${stats.totalProfit}
- Missing Product Costs: ${stats.missingCostCount} items
- Product sales rankings: ${JSON.stringify(stats.topProducts)}
- Marketplaces breakdown: ${JSON.stringify(stats.platformBreakdown)}

Provide:
1. Executive Summary: 2 sentences analyzing general margin health.
2. Sales Channel Analysis: Compare Amazon, Flipkart, and Meesho net returns.
3. Pricing & COGS Recommendations: Advise on pricing based on top products.
4. Risk Management Alerts: Highlight catalog gaps or low margin categories.

Use standard markdown formatting. Be direct, clear, and actionable.`;

    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || 'Detailed analysis unavailable.';
  } catch (error: any) {
    return `### Analysis Error\nFailed to call Google Gemini API: ${error.message}`;
  }
}
