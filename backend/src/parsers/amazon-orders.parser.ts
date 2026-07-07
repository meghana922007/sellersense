import { parseCsvOrTsv } from '../utils/csv';

export interface ParsedAmazonOrder {
  marketplaceOrderId: string;
  orderDate: Date;
  status: string;
  sku: string;
  productName: string;
  quantity: number;
  salePrice: number;
  rawData: string;
}

export function parseAmazonOrders(filePath: string): ParsedAmazonOrder[] {
  const rows = parseCsvOrTsv(filePath);
  const parsedOrders: ParsedAmazonOrder[] = [];

  for (const row of rows) {
    // Required fields check
    const orderId = row['amazon-order-id'];
    const sku = row['sku'];
    const qtyStr = row['quantity-purchased'];
    const priceStr = row['item-price'];
    const purchaseDate = row['purchase-date'];

    if (!orderId || !sku || !qtyStr || !purchaseDate) {
      continue; // Skip invalid/incomplete headers or summary rows
    }

    const quantity = parseInt(qtyStr, 10);
    const salePrice = priceStr ? parseFloat(priceStr) : 0.0;

    if (isNaN(quantity) || quantity <= 0) {
      continue; // Skip invalid records
    }

    // Map order status
    let status = 'SHIPPED'; // Default
    const rawStatus = row['order-status'];
    if (rawStatus) {
      const lowerStatus = rawStatus.toLowerCase();
      if (lowerStatus.includes('pending')) {
        status = 'PENDING';
      } else if (lowerStatus.includes('unshipped')) {
        status = 'PENDING';
      } else if (lowerStatus.includes('cancel')) {
        status = 'CANCELLED';
      } else if (lowerStatus.includes('return')) {
        status = 'RETURNED';
      } else if (lowerStatus.includes('shipped') || lowerStatus.includes('complete') || lowerStatus.includes('delivered')) {
        status = 'DELIVERED';
      }
    }

    // Attempt to parse date safely
    let orderDate: Date;
    try {
      orderDate = new Date(purchaseDate);
      if (isNaN(orderDate.getTime())) {
        orderDate = new Date();
      }
    } catch {
      orderDate = new Date();
    }

    parsedOrders.push({
      marketplaceOrderId: orderId,
      orderDate,
      status,
      sku,
      productName: row['product-name'] || sku,
      quantity,
      salePrice,
      rawData: JSON.stringify(row),
    });
  }

  return parsedOrders;
}
