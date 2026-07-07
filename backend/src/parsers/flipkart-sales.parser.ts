import xlsx from 'xlsx';

export interface ParsedFlipkartOrder {
  marketplaceOrderId: string;
  orderDate: Date;
  status: string;
  sku: string;
  productName: string;
  quantity: number;
  salePrice: number;
  marketplaceFee: number;
  fulfillmentFee: number;
  netRevenue: number;
  rawData: string;
}

export function parseFlipkartSales(filePath: string): ParsedFlipkartOrder[] {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet);

  const parsedOrders: ParsedFlipkartOrder[] = [];

  for (const row of rows) {
    // Normalize headers by converting keys to lowercase and removing spaces/dashes
    const normalizedRow: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
      normalizedRow[normalizedKey] = row[key];
    }

    // Required columns mapping: Order ID, Order Date, SKU, Quantity, Item Price
    // Keys after normalization: 'orderid', 'orderdate', 'sku', 'quantity', 'itemprice'
    const orderId = normalizedRow['orderid'];
    const sku = normalizedRow['sku'];
    const qtyVal = normalizedRow['quantity'];
    const priceVal = normalizedRow['itemprice'] || normalizedRow['saleprice'];
    const orderDateVal = normalizedRow['orderdate'];

    if (!orderId || !sku || !qtyVal || !orderDateVal) {
      continue; // Skip summary rows or headers
    }

    const quantity = parseInt(qtyVal, 10);
    const salePrice = parseFloat(priceVal);

    if (isNaN(quantity) || quantity <= 0 || isNaN(salePrice)) {
      continue;
    }

    // Date parsing
    let orderDate = new Date();
    try {
      if (typeof orderDateVal === 'number') {
        // Excel serial date representation
        orderDate = xlsx.SSF.parse_date_code(orderDateVal) as unknown as Date;
        if (!(orderDate instanceof Date)) {
          // If parse_date_code returns object, reconstruct Date
          const obj = orderDate as any;
          orderDate = new Date(obj.y, obj.m - 1, obj.d, obj.H, obj.M, obj.S);
        }
      } else {
        orderDate = new Date(orderDateVal);
      }
      if (isNaN(orderDate.getTime())) {
        orderDate = new Date();
      }
    } catch {
      orderDate = new Date();
    }

    // Fees parsing
    const marketplaceFee = Math.abs(parseFloat(normalizedRow['commission'] || '0'));
    const fulfillmentFee = Math.abs(parseFloat(normalizedRow['shippingfee'] || '0'));
    
    // Status mapping
    let status = 'SHIPPED';
    const rawStatus = normalizedRow['orderstatus'] || normalizedRow['status'];
    if (rawStatus) {
      const lowerStatus = rawStatus.toString().toLowerCase();
      if (lowerStatus.includes('cancel')) {
        status = 'CANCELLED';
      } else if (lowerStatus.includes('return')) {
        status = 'RETURNED';
      } else if (lowerStatus.includes('deliver')) {
        status = 'DELIVERED';
      } else if (lowerStatus.includes('pending') || lowerStatus.includes('hold')) {
        status = 'PENDING';
      }
    }

    const netRevenue = salePrice - marketplaceFee - fulfillmentFee;

    parsedOrders.push({
      marketplaceOrderId: orderId.toString(),
      orderDate,
      status,
      sku: sku.toString(),
      productName: (row['Product Name'] || sku).toString(),
      quantity,
      salePrice,
      marketplaceFee: isNaN(marketplaceFee) ? 0 : marketplaceFee,
      fulfillmentFee: isNaN(fulfillmentFee) ? 0 : fulfillmentFee,
      netRevenue: isNaN(netRevenue) ? salePrice : netRevenue,
      rawData: JSON.stringify(row),
    });
  }

  return parsedOrders;
}
