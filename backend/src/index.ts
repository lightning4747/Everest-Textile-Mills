import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { httpLogger } from './middleware/httpLogger.js';
import { metricsMiddleware, metricsHandler } from './metrics.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { ok } from './lib/response.js';

// Route imports
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import machinesRoutes from './routes/machines.js';
import yarnRoutes from './routes/yarn.js';
import suppliersRoutes from './routes/suppliers.js';
import salesOrdersRoutes from './routes/salesOrders.js';
import productionOrdersRoutes from './routes/productionOrders.js';
import fabricRollsRoutes from './routes/fabricRolls.js';
import dispatchesRoutes from './routes/dispatches.js';
import reportsRoutes from './routes/reports.js';
import forecastRoutes from './routes/forecast.js';
import inventoryRoutes from './routes/inventory.js';

const app = express();

// ── Security & Utility Middleware ──────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        config.NODE_ENV !== 'production' ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin === config.CORS_ORIGIN
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);
app.use(metricsMiddleware);

// ── Observability & Health ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  ok(res, { status: 'healthy', timestamp: new Date().toISOString(), env: config.NODE_ENV });
});

app.get('/metrics', metricsHandler);

// Direct top-level /api/forecast endpoint
app.use('/api/forecast', forecastRoutes);

// ── Domain API Routes (/api/v1) ─────────────────────────────────────────────
const api = express.Router();

api.use('/auth', authRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/machines', machinesRoutes);
api.use('/yarn', yarnRoutes);
api.use('/suppliers', suppliersRoutes);
api.use('/sales-orders', salesOrdersRoutes);
api.use('/production-orders', productionOrdersRoutes);
api.use('/fabric-rolls', fabricRollsRoutes);
api.use('/dispatches', dispatchesRoutes);
api.use('/reports', reportsRoutes);
api.use('/forecast', forecastRoutes);
api.use('/inventory', inventoryRoutes);

app.use('/api/v1', api);

// ── 404 & Error Handling ────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

import { updateYarnLowStockGauge, updateProductionOutputGauge } from './services/stubs.js';
import { getInferenceSession } from './services/forecaster.js';

// ── Start Server ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, async () => {
    try {
      await getInferenceSession();
      console.log('🤖 ONNX Revenue Prediction Model initialized.');
    } catch (err) {
      console.warn('⚠️ ONNX Model initialization warning:', err);
    }
    try {
      await updateYarnLowStockGauge();
      await updateProductionOutputGauge();
    } catch {
      // ignore startup gauge sync errors if db is warming up
    }
    console.log(`🚀 Everest Textile Mills ERP Backend running on port ${config.PORT}`);
    console.log(`🩺 Health check available at http://localhost:${config.PORT}/health`);
    console.log(`📊 Prometheus metrics available at http://localhost:${config.PORT}/metrics`);
  });
}

export default app;
