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

const app = express();

// ── Security & Utility Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);
app.use(metricsMiddleware);

// ── Observability & Health ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  ok(res, { status: 'healthy', timestamp: new Date().toISOString(), env: config.NODE_ENV });
});

app.get('/metrics', metricsHandler);

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

app.use('/api/v1', api);

// ── 404 & Error Handling ────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`🚀 Everest Textile Mills ERP Backend running on port ${config.PORT}`);
    console.log(`🩺 Health check available at http://localhost:${config.PORT}/health`);
    console.log(`📊 Prometheus metrics available at http://localhost:${config.PORT}/metrics`);
  });
}

export default app;
