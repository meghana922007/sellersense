import { parseCsvOrTsv } from '../utils/csv';

export interface ParsedAmazonInventory {
  sku: string;
  fulfillableQuantity: number;
  reservedQuantity: number;
  inboundQuantity: number;
  totalQuantity: number;
}

export function parseAmazonInventory(filePath: string): ParsedAmazonInventory[] {
  const rows = parseCsvOrTsv(filePath);
  const parsedItems: ParsedAmazonInventory[] = [];

  for (const row of rows) {
    // Standard Amazon inventory headers: 'sku' or 'seller-sku', 'asin', 'afn-fulfillable-quantity' or similar
    // Find keys regardless of exact hyphens or prefixes
    const rowKeys = Object.keys(row);
    const skuKey = rowKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === 'sku' || k.toLowerCase().replace(/[\s_-]/g, '') === 'sellersku');
    const fulfillableKey = rowKeys.find(k => k.toLowerCase().includes('fulfillable'));
    const reservedKey = rowKeys.find(k => k.toLowerCase().includes('reserved'));
    const inboundKey = rowKeys.find(k => k.toLowerCase().includes('inbound'));

    const sku = skuKey ? row[skuKey] : '';
    if (!sku) continue;

    const fulfillable = fulfillableKey ? parseInt(row[fulfillableKey], 10) : 0;
    const reserved = reservedKey ? parseInt(row[reservedKey], 10) : 0;
    const inbound = inboundKey ? parseInt(row[inboundKey], 10) : 0;

    const parsedFulfillable = isNaN(fulfillable) ? 0 : fulfillable;
    const parsedReserved = isNaN(reserved) ? 0 : reserved;
    const parsedInbound = isNaN(inbound) ? 0 : inbound;

    const totalQuantity = parsedFulfillable + parsedReserved + parsedInbound;

    parsedItems.push({
      sku,
      fulfillableQuantity: parsedFulfillable,
      reservedQuantity: parsedReserved,
      inboundQuantity: parsedInbound,
      totalQuantity,
    });
  }

  return parsedItems;
}
