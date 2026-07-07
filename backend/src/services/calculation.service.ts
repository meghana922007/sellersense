import prisma from '../config/database';

/**
 * Computes net revenue and profit values.
 */
export function computeOrderProfit(
  salePrice: number,
  totalFees: number,
  quantity: number,
  costPrice: number | null
): { netRevenue: number; profit: number | null } {
  const netRevenue = salePrice - totalFees;
  const profit = costPrice !== null ? netRevenue - (costPrice * quantity) : null;
  return { netRevenue, profit };
}

/**
 * Iterates through historical order logs matching a SKU and marketplace,
 * updating their costPrice snapshot and recalculating net profit.
 */
export async function backfillOrderProfits(
  userId: string,
  sku: string,
  marketplace: string,
  costPrice: number
): Promise<number> {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      sku,
      marketplace,
    },
  });

  if (orders.length === 0) return 0;

  const updates = orders.map((order) => {
    const { netRevenue, profit } = computeOrderProfit(
      order.salePrice,
      order.totalFees,
      order.quantity,
      costPrice
    );

    return prisma.order.update({
      where: { id: order.id },
      data: {
        costPrice,
        netRevenue,
        profit,
      },
    });
  });

  await prisma.$transaction(updates);
  return updates.length;
}
