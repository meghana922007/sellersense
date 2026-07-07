import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.join(__dirname, '../../../sample_reports');
fs.mkdirSync(outputDir, { recursive: true });

console.log(`Generating large realistic mock records inside: ${outputDir}`);

// Define product catalog with prices and typical fees
const PRODUCTS = [
  { sku: 'MOCK-PHONE-BLUE', name: 'Premium Blue Cover iPhone', price: 499, cost: 150, referral: 75, fulfillment: 35 },
  { sku: 'MOCK-CABLE-USB', name: 'Braided USB Type-C Cable', price: 199, cost: 45, referral: 30, fulfillment: 25 },
  { sku: 'MOCK-STAND-METAL', name: 'Adjustable Metal Desk Stand', price: 899, cost: 320, referral: 135, fulfillment: 45 },
  { sku: 'MOCK-CHARGER-FAST', name: '20W Superfast Wall Charger', price: 699, cost: 180, referral: 105, fulfillment: 35 },
  { sku: 'MOCK-EARBUDS-PRO', name: 'Wireless Pro Noise-Cancelling Earbuds', price: 2999, cost: 1200, referral: 450, fulfillment: 60 }
];

const STATUSES = ['Shipped', 'Shipped', 'Shipped', 'Shipped', 'Shipped', 'Pending', 'Cancelled', 'Returned'];

function getRandomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 1. Generate Amazon Orders and corresponding Settlement data
const startDate = new Date('2026-06-01T00:00:00Z');
const endDate = new Date('2026-07-07T00:00:00Z');

let amzOrdersCsv = 'amazon-order-id,purchase-date,sku,product-name,quantity-purchased,item-price,order-status\n';
let amzSettlementCsv = 'amazon-order-id,amount,fee-type,fee-amount,settlement-date\n';

const generatedAmzOrders: any[] = [];

for (let i = 0; i < 100; i++) {
  const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  const date = getRandomDate(startDate, endDate).toISOString();
  const orderId = `171-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const qty = Math.random() > 0.9 ? 2 : 1;
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const itemPrice = prod.price * qty;

  amzOrdersCsv += `${orderId},${date},${prod.sku},${prod.name},${qty},${itemPrice.toFixed(2)},${status}\n`;
  generatedAmzOrders.push({ orderId, prod, qty, date, itemPrice });
}

// Write Amazon Orders
fs.writeFileSync(path.join(outputDir, 'amazon_orders.csv'), amzOrdersCsv);

// Generate matching Settlement fees for Shipped/Delivered orders
for (const order of generatedAmzOrders) {
  const settleDate = getRandomDate(new Date(order.date), endDate).toISOString();
  const refFee = order.prod.referral * order.qty;
  const fulFee = order.prod.fulfillment * order.qty;

  amzSettlementCsv += `${order.orderId},${order.itemPrice.toFixed(2)},ReferralFee,-${refFee.toFixed(2)},${settleDate}\n`;
  amzSettlementCsv += `${order.orderId},${order.itemPrice.toFixed(2)},FulfillmentFee,-${fulFee.toFixed(2)},${settleDate}\n`;
}
fs.writeFileSync(path.join(outputDir, 'amazon_settlement.csv'), amzSettlementCsv);

// 2. Generate FBA Inventory CSV
let amzInventoryCsv = 'sku,fulfillable-quantity,reserved-quantity,inbound-quantity\n';
for (const prod of PRODUCTS) {
  const ful = Math.floor(5 + Math.random() * 150);
  const res = Math.floor(Math.random() * 15);
  const inb = Math.floor(Math.random() * 40);
  amzInventoryCsv += `${prod.sku},${ful},${res},${inb}\n`;
}
fs.writeFileSync(path.join(outputDir, 'amazon_inventory.csv'), amzInventoryCsv);

// 3. Generate Flipkart Sales Excel Data
const fkOrders: any[] = [];
for (let i = 0; i < 75; i++) {
  const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  const orderId = `OD${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;
  const date = getRandomDate(startDate, endDate).toISOString().slice(0, 19).replace('T', ' ');
  const qty = Math.random() > 0.9 ? 2 : 1;
  const price = prod.price * qty;
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];

  const comm = -(prod.referral * qty);
  const ship = -(prod.fulfillment * qty);

  fkOrders.push({
    'Order ID': orderId,
    'Order Date': date,
    'SKU': prod.sku,
    'Product Name': prod.name,
    'Quantity': qty,
    'Item Price': price,
    'Commission': comm,
    'Shipping Fee': ship,
    'Order Status': status
  });
}
const fkWb = xlsx.utils.book_new();
const fkWs = xlsx.utils.json_to_sheet(fkOrders);
xlsx.utils.book_append_sheet(fkWb, fkWs, 'Sales');
xlsx.writeFile(fkWb, path.join(outputDir, 'flipkart_sales.xlsx'));

// 4. Generate Meesho Sales Excel & ZIP
const meeshoOrders: any[] = [];
for (let i = 0; i < 60; i++) {
  const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  const orderNo = `MEESHO-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const date = getRandomDate(startDate, endDate).toISOString().slice(0, 19).replace('T', ' ');
  const qty = Math.random() > 0.9 ? 2 : 1;
  const price = prod.price * qty;
  const supplierEarnings = (prod.price - (prod.referral * 0.4)) * qty; // Meesho has lower margins/commissions
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];

  meeshoOrders.push({
    'Sub Order No': orderNo,
    'Order Date': date,
    'SKU': prod.sku,
    'Product Name': prod.name,
    'Quantity': qty,
    'Total Price': price,
    'Supplier Earnings': supplierEarnings,
    'Order Status': status
  });
}
const meeshoWb = xlsx.utils.book_new();
const meeshoWs = xlsx.utils.json_to_sheet(meeshoOrders);
xlsx.utils.book_append_sheet(meeshoWb, meeshoWs, 'Orders');
const meeshoExcelPath = path.join(outputDir, 'meesho_sales.xlsx');
xlsx.writeFile(meeshoWb, meeshoExcelPath);

// ZIP it up on Mac
try {
  const zipPath = path.join(outputDir, 'meesho_orders.zip');
  execSync(`zip -j "${zipPath}" "${meeshoExcelPath}"`);
  fs.unlinkSync(meeshoExcelPath); // remove unzipped excel
} catch (e) {
  console.error('Failed to zip Meesho file natively:', e);
}

console.log('Large realistic sample reports generated successfully!');
