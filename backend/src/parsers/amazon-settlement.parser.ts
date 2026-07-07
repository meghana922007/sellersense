import { parseCsvOrTsv } from '../utils/csv';

export interface ParsedAmazonSettlement {
  marketplaceOrderId: string;
  marketplaceFee: number;
  fulfillmentFee: number;
  otherFees: number;
  settlementDate: Date;
}

export function parseAmazonSettlement(filePath: string): ParsedAmazonSettlement[] {
  const rows = parseCsvOrTsv(filePath);
  const aggregates: Record<string, {
    marketplaceOrderId: string;
    marketplaceFee: number;
    fulfillmentFee: number;
    otherFees: number;
    settlementDate: Date;
  }> = {};

  for (const row of rows) {
    const orderId = row['amazon-order-id'];
    const amountStr = row['amount'];
    const feeType = row['fee-type'];
    const feeAmtStr = row['fee-amount'];
    const settleDateStr = row['settlement-date'];

    if (!orderId) {
      continue; // Skip lines without order IDs (such as global storage fees or balances)
    }

    // Attempt to parse settlement date
    let settlementDate = new Date();
    if (settleDateStr) {
      try {
        const d = new Date(settleDateStr);
        if (!isNaN(d.getTime())) {
          settlementDate = d;
        }
      } catch {
        // Fallback to now
      }
    }

    // Initialize accumulator for this order if not present
    if (!aggregates[orderId]) {
      aggregates[orderId] = {
        marketplaceOrderId: orderId,
        marketplaceFee: 0,
        fulfillmentFee: 0,
        otherFees: 0,
        settlementDate,
      };
    }

    const orderRecord = aggregates[orderId];

    // Parse fee amount (Amazon reports fees as negative values; convert to absolute positive)
    if (feeType && feeAmtStr) {
      const feeAmt = Math.abs(parseFloat(feeAmtStr));
      if (!isNaN(feeAmt)) {
        const type = feeType.toLowerCase();

        if (type.includes('referral') || type.includes('closing')) {
          orderRecord.marketplaceFee += feeAmt;
        } else if (type.includes('pick') || type.includes('pack') || type.includes('weight') || type.includes('shipping')) {
          orderRecord.fulfillmentFee += feeAmt;
        } else {
          orderRecord.otherFees += feeAmt;
        }
      }
    }
  }

  return Object.values(aggregates);
}
