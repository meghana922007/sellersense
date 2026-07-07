import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import unzipper from 'unzipper';
import prisma from '../config/database';
import { parseCsvOrTsv } from '../utils/csv';
import { parseAmazonOrders } from '../parsers/amazon-orders.parser';
import { parseAmazonSettlement } from '../parsers/amazon-settlement.parser';
import { parseAmazonInventory } from '../parsers/amazon-inventory.parser';
import { parseFlipkartSales } from '../parsers/flipkart-sales.parser';
import { parseMeeshoForward } from '../parsers/meesho-forward.parser';
import { computeOrderProfit } from './calculation.service';

export interface FileImportResult {
  marketplace: string;
  reportType: 'ORDERS' | 'SETTLEMENT' | 'INVENTORY';
  processedCount: number;
}

/**
 * Automatically inspects the uploaded file headers to determine the marketplace and report type.
 */
export async function detectMarketplaceAndReportType(
  filePath: string
): Promise<{ marketplace: string; reportType: 'ORDERS' | 'SETTLEMENT' | 'INVENTORY' }> {
  const ext = path.extname(filePath).toLowerCase();
  let checkPath = filePath;
  let tempDir = '';

  try {
    // For ZIP archives (Meesho), unzip to examine spreadsheet headers
    if (ext === '.zip') {
      tempDir = filePath + '-detect-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });

      const directory = await unzipper.Open.file(filePath);
      await directory.extract({ path: tempDir });

      const files = fs.readdirSync(tempDir);
      const excelFile = files.find((f) => f.endsWith('.xlsx') || f.endsWith('.xls'));
      if (!excelFile) {
        throw new Error('ZIP archive does not contain Excel spreadsheets');
      }
      checkPath = path.join(tempDir, excelFile);
    }

    const checkExt = path.extname(checkPath).toLowerCase();

    if (checkExt === '.xlsx' || checkExt === '.xls') {
      // Read headers from Excel first row
      const workbook = xlsx.readFile(checkPath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
      if (rows.length === 0) throw new Error('Excel sheet is empty');

      const headers = (rows[0] as any[]).map((h) => h?.toString().toLowerCase().replace(/[\s_-]/g, '') || '');

      // Check header matches
      if (headers.includes('suborderno') || headers.includes('supplierprice')) {
        return { marketplace: 'MEESHO', reportType: 'ORDERS' };
      }
      if (headers.includes('orderid') || headers.includes('itemprice')) {
        return { marketplace: 'FLIPKART', reportType: 'ORDERS' };
      }
      throw new Error('Unsupported Excel column configuration');
    } else {
      // Read CSV first line headers
      const rows = parseCsvOrTsv(checkPath);
      if (rows.length === 0) throw new Error('CSV file is empty');
      const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim().replace(/[\s_-]/g, ''));

      if (headers.includes('amazonorderid') && headers.includes('purchasedate')) {
        return { marketplace: 'AMAZON', reportType: 'ORDERS' };
      }
      if (headers.includes('amazonorderid') && headers.includes('feetype')) {
        return { marketplace: 'AMAZON', reportType: 'SETTLEMENT' };
      }
      if (headers.includes('sku') && (headers.includes('fulfillablequantity') || headers.includes('afnfulfillablequantity') || headers.includes('reservedquantity'))) {
        return { marketplace: 'AMAZON', reportType: 'INVENTORY' };
      }
      throw new Error('Unsupported CSV column layout');
    }
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Handles parsing and database storage inside transaction batches.
 */
export async function processFileImport(
  userId: string,
  filePath: string,
  jobId: string
): Promise<FileImportResult> {
  const { marketplace, reportType } = await detectMarketplaceAndReportType(filePath);

  await prisma.importJob.update({
    where: { id: jobId },
    data: { marketplace, status: 'PROCESSING' },
  });

  let processedCount = 0;

  if (marketplace === 'AMAZON') {
    if (reportType === 'ORDERS') {
      const records = parseAmazonOrders(filePath);
      
      await prisma.importJob.update({
        where: { id: jobId },
        data: { totalRows: records.length },
      });

      // Process orders in transactional batches to optimize write speed
      for (const record of records) {
        // Auto-catalog product if missing
        let product = await prisma.product.findUnique({
          where: {
            userId_sku_marketplace: {
              userId,
              sku: record.sku,
              marketplace: 'AMAZON',
            },
          },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              userId,
              sku: record.sku,
              name: record.productName,
              marketplace: 'AMAZON',
              sellingPrice: record.salePrice,
            },
          });
        }

        const costPrice = product.costPrice;
        const { netRevenue, profit } = computeOrderProfit(
          record.salePrice,
          0, // Fees are 0 initially until settlement file uploaded
          record.quantity,
          costPrice
        );

        // Upsert order record
        await prisma.order.upsert({
          where: {
            userId_marketplace_marketplaceOrderId_sku: {
              userId,
              marketplace: 'AMAZON',
              marketplaceOrderId: record.marketplaceOrderId,
              sku: record.sku,
            },
          },
          update: {
            status: record.status,
            orderDate: record.orderDate,
            salePrice: record.salePrice,
            productName: record.productName,
          },
          create: {
            userId,
            marketplace: 'AMAZON',
            marketplaceOrderId: record.marketplaceOrderId,
            orderDate: record.orderDate,
            status: record.status,
            sku: record.sku,
            productName: record.productName,
            quantity: record.quantity,
            salePrice: record.salePrice,
            costPrice,
            netRevenue,
            profit,
            rawData: record.rawData,
            productId: product.id,
          },
        });

        processedCount++;
        if (processedCount % 50 === 0) {
          await prisma.importJob.update({
            where: { id: jobId },
            data: { processedRows: processedCount },
          });
        }
      }
    } else if (reportType === 'SETTLEMENT') {
      // Settlement fees mapping
      const payments = parseAmazonSettlement(filePath);

      await prisma.importJob.update({
        where: { id: jobId },
        data: { totalRows: payments.length },
      });

      for (const payment of payments) {
        // Match existing orders for this transaction id and apply fees retroactively
        const matchingOrders = await prisma.order.findMany({
          where: {
            userId,
            marketplace: 'AMAZON',
            marketplaceOrderId: payment.marketplaceOrderId,
          },
        });

        for (const order of matchingOrders) {
          const totalFees = payment.marketplaceFee + payment.fulfillmentFee + payment.otherFees;
          const { netRevenue, profit } = computeOrderProfit(
            order.salePrice,
            totalFees,
            order.quantity,
            order.costPrice
          );

          await prisma.order.update({
            where: { id: order.id },
            data: {
              marketplaceFee: payment.marketplaceFee,
              fulfillmentFee: payment.fulfillmentFee,
              otherFees: payment.otherFees,
              totalFees,
              netRevenue,
              profit,
              settlementDate: payment.settlementDate,
            },
          });
        }

        processedCount++;
        if (processedCount % 50 === 0) {
          await prisma.importJob.update({
            where: { id: jobId },
            data: { processedRows: processedCount },
          });
        }
      }
    } else if (reportType === 'INVENTORY') {
      const stockItems = parseAmazonInventory(filePath);

      await prisma.importJob.update({
        where: { id: jobId },
        data: { totalRows: stockItems.length },
      });

      for (const item of stockItems) {
        // Make sure a product matches this SKU to associate
        let product = await prisma.product.findUnique({
          where: {
            userId_sku_marketplace: {
              userId,
              sku: item.sku,
              marketplace: 'AMAZON',
            },
          },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              userId,
              sku: item.sku,
              name: `Amazon SKU ${item.sku}`,
              marketplace: 'AMAZON',
              currentStock: item.fulfillableQuantity,
            },
          });
        } else {
          // Update product current stock
          await prisma.product.update({
            where: { id: product.id },
            data: { currentStock: item.fulfillableQuantity },
          });
        }

        // Upsert inventory record
        await prisma.inventory.upsert({
          where: {
            id: (await prisma.inventory.findFirst({
              where: { userId, sku: item.sku, marketplace: 'AMAZON' },
            }))?.id || 'new-uuid',
          },
          update: {
            fulfillableQuantity: item.fulfillableQuantity,
            reservedQuantity: item.reservedQuantity,
            inboundQuantity: item.inboundQuantity,
            totalQuantity: item.totalQuantity,
            lastUpdated: new Date(),
          },
          create: {
            userId,
            sku: item.sku,
            marketplace: 'AMAZON',
            productId: product.id,
            fulfillableQuantity: item.fulfillableQuantity,
            reservedQuantity: item.reservedQuantity,
            inboundQuantity: item.inboundQuantity,
            totalQuantity: item.totalQuantity,
          },
        });

        processedCount++;
        if (processedCount % 50 === 0) {
          await prisma.importJob.update({
            where: { id: jobId },
            data: { processedRows: processedCount },
          });
        }
      }
    }
  } else if (marketplace === 'FLIPKART') {
    const records = parseFlipkartSales(filePath);

    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalRows: records.length },
    });

    for (const record of records) {
      let product = await prisma.product.findUnique({
        where: {
          userId_sku_marketplace: {
            userId,
            sku: record.sku,
            marketplace: 'FLIPKART',
          },
        },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            userId,
            sku: record.sku,
            name: record.productName,
            marketplace: 'FLIPKART',
            sellingPrice: record.salePrice,
          },
        });
      }

      const costPrice = product.costPrice;
      const { profit } = computeOrderProfit(
        record.salePrice,
        record.marketplaceFee + record.fulfillmentFee,
        record.quantity,
        costPrice
      );

      await prisma.order.upsert({
        where: {
          userId_marketplace_marketplaceOrderId_sku: {
            userId,
            marketplace: 'FLIPKART',
            marketplaceOrderId: record.marketplaceOrderId,
            sku: record.sku,
          },
        },
        update: {
          status: record.status,
          orderDate: record.orderDate,
          salePrice: record.salePrice,
          marketplaceFee: record.marketplaceFee,
          fulfillmentFee: record.fulfillmentFee,
          totalFees: record.marketplaceFee + record.fulfillmentFee,
          netRevenue: record.netRevenue,
          profit,
        },
        create: {
          userId,
          marketplace: 'FLIPKART',
          marketplaceOrderId: record.marketplaceOrderId,
          orderDate: record.orderDate,
          status: record.status,
          sku: record.sku,
          productName: record.productName,
          quantity: record.quantity,
          salePrice: record.salePrice,
          marketplaceFee: record.marketplaceFee,
          fulfillmentFee: record.fulfillmentFee,
          totalFees: record.marketplaceFee + record.fulfillmentFee,
          costPrice,
          netRevenue: record.netRevenue,
          profit,
          rawData: record.rawData,
          productId: product.id,
        },
      });

      processedCount++;
      if (processedCount % 50 === 0) {
        await prisma.importJob.update({
          where: { id: jobId },
          data: { processedRows: processedCount },
        });
      }
    }
  } else if (marketplace === 'MEESHO') {
    const records = await parseMeeshoForward(filePath);

    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalRows: records.length },
    });

    for (const record of records) {
      let product = await prisma.product.findUnique({
        where: {
          userId_sku_marketplace: {
            userId,
            sku: record.sku,
            marketplace: 'MEESHO',
          },
        },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            userId,
            sku: record.sku,
            name: record.productName,
            marketplace: 'MEESHO',
            sellingPrice: record.salePrice,
          },
        });
      }

      const costPrice = product.costPrice;
      const { profit } = computeOrderProfit(
        record.salePrice,
        record.marketplaceFee,
        record.quantity,
        costPrice
      );

      await prisma.order.upsert({
        where: {
          userId_marketplace_marketplaceOrderId_sku: {
            userId,
            marketplace: 'MEESHO',
            marketplaceOrderId: record.marketplaceOrderId,
            sku: record.sku,
          },
        },
        update: {
          status: record.status,
          orderDate: record.orderDate,
          salePrice: record.salePrice,
          marketplaceFee: record.marketplaceFee,
          totalFees: record.marketplaceFee,
          netRevenue: record.netRevenue,
          profit,
        },
        create: {
          userId,
          marketplace: 'MEESHO',
          marketplaceOrderId: record.marketplaceOrderId,
          orderDate: record.orderDate,
          status: record.status,
          sku: record.sku,
          productName: record.productName,
          quantity: record.quantity,
          salePrice: record.salePrice,
          marketplaceFee: record.marketplaceFee,
          totalFees: record.marketplaceFee,
          costPrice,
          netRevenue: record.netRevenue,
          profit,
          rawData: record.rawData,
          productId: product.id,
        },
      });

      processedCount++;
      if (processedCount % 50 === 0) {
        await prisma.importJob.update({
          where: { id: jobId },
          data: { processedRows: processedCount },
        });
      }
    }
  }

  // Cleanup local disk file after ingest successfully completes
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return { marketplace, reportType, processedCount };
}
