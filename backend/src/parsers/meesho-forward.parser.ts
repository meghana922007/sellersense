import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import xlsx from 'xlsx';

export interface ParsedMeeshoOrder {
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

export async function parseMeeshoForward(filePath: string): Promise<ParsedMeeshoOrder[]> {
  const ext = path.extname(filePath).toLowerCase();
  let xlsxFilePath = filePath;
  let tempDir = '';

  try {
    // If the file is a zip archive (common for Meesho exports), extract it first
    if (ext === '.zip') {
      tempDir = filePath + '-extracted-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });

      const directory = await unzipper.Open.file(filePath);
      await directory.extract({ path: tempDir });

      // Search for any spreadsheet inside the extracted folder
      const files = fs.readdirSync(tempDir);
      const excelFile = files.find((f) => f.endsWith('.xlsx') || f.endsWith('.xls'));
      if (!excelFile) {
        throw new Error('No Excel file (.xlsx, .xls) found inside the Meesho ZIP archive');
      }
      xlsxFilePath = path.join(tempDir, excelFile);
    }

    // Parse Excel content
    const workbook = xlsx.readFile(xlsxFilePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet);

    const parsedOrders: ParsedMeeshoOrder[] = [];

    for (const row of rows) {
      // Normalize row keys
      const normalizedRow: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
        normalizedRow[normalizedKey] = row[key];
      }

      // Column mapping check
      // Target keys: 'suborderno', 'sku', 'quantity', 'totalprice', 'orderdate'
      const orderId = normalizedRow['suborderno'] || normalizedRow['orderid'];
      const sku = normalizedRow['sku'];
      const qtyVal = normalizedRow['quantity'] || normalizedRow['qty'];
      const priceVal = normalizedRow['totalprice'] || normalizedRow['itemprice'] || normalizedRow['saleprice'];
      const orderDateVal = normalizedRow['orderdate'];

      if (!orderId || !sku || !qtyVal || !orderDateVal) {
        continue;
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
          orderDate = xlsx.SSF.parse_date_code(orderDateVal) as unknown as Date;
          if (!(orderDate instanceof Date)) {
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

      // Meesho fee calculation
      // Supplier Earnings is what Meesho pays the merchant after commission.
      // Platform Fee = Total Price - Supplier Earnings (net revenue is Supplier Earnings)
      const supplierEarnings = parseFloat(normalizedRow['supplierearnings'] || normalizedRow['meeshoprice'] || priceVal);
      const marketplaceFee = isNaN(supplierEarnings) ? 0 : Math.max(0, salePrice - supplierEarnings);
      const netRevenue = isNaN(supplierEarnings) ? salePrice : supplierEarnings;

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
        } else if (lowerStatus.includes('pending')) {
          status = 'PENDING';
        }
      }

      parsedOrders.push({
        marketplaceOrderId: orderId.toString(),
        orderDate,
        status,
        sku: sku.toString(),
        productName: (row['Product Name'] || sku).toString(),
        quantity,
        salePrice,
        marketplaceFee,
        fulfillmentFee: 0, // Meesho shipping fees are generally pre-subtracted or handled by customer
        netRevenue,
        rawData: JSON.stringify(row),
      });
    }

    return parsedOrders;
  } finally {
    // Cleanup temporary extracted files if we unzipped
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Failed to clean up temporary folder:', err);
      }
    }
  }
}
