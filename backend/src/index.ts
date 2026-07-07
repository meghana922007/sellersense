import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables before routing imports
dotenv.config();

import authRoutes from './routes/auth.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import importRoutes from './routes/import.routes';
import expenseRoutes from './routes/expense.routes';
import inventoryRoutes from './routes/inventory.routes';
import reportRoutes from './routes/report.routes';
import insightRoutes from './routes/insight.routes';
import { startEmailReportsCron } from './jobs/email-reports.job';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const PORT = process.env.PORT || 5001;

// Start background cron jobs on server startup
startEmailReportsCron();

// Global Middleware configurations
app.use(cors({
  origin: '*', // For local dev integration; restrict to specific client origin in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Route bindings
app.use('/api/auth', authRoutes);
app.use('/api/marketplaces', marketplaceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/import', importRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/insights', insightRoutes);

// Apply central error logger middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 SellerSense Backend listening at http://localhost:${PORT}`);
});

export default app;
