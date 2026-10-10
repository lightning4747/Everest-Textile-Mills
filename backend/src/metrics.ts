import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

// ── Registry ─────────────────────────────────────────────────────────────────
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

// ── HTTP Metrics ──────────────────────────────────────────────────────────────
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// ── Database Metrics ──────────────────────────────────────────────────────────
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [registry],
});

// ── Business Metrics ─────────────────────────────────────────────────────────
export const ordersCreatedTotal = new Counter({
  name: 'orders_created_total',
  help: 'Total sales orders created',
  registers: [registry],
});

export const ordersDispatchedTotal = new Counter({
  name: 'orders_dispatched_total',
  help: 'Total orders dispatched',
  registers: [registry],
});

export const qcDecisionsTotal = new Counter({
  name: 'fabric_rolls_qc_decision_total',
  help: 'QC decisions made on fabric rolls',
  labelNames: ['result'],
  registers: [registry],
});

export const yarnStockLowCount = new Gauge({
  name: 'yarn_stock_low_count',
  help: 'Number of yarn stock items below reorder level',
  registers: [registry],
});

export const productionOutputMetresToday = new Gauge({
  name: 'production_output_metres_today',
  help: 'Total metres produced today across all machines',
  registers: [registry],
});

// ── HTTP Metrics Middleware ───────────────────────────────────────────────────
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e9;
    // Normalize route: use req.route?.path if available, fallback to pathname
    const route = (req as Request & { route?: { path: string } }).route?.path ?? req.path;
    const labels = {
      method:      req.method,
      route,
      status_code: String(res.statusCode),
    };
    httpRequestDuration.observe(labels, durationMs);
    httpRequestsTotal.inc(labels);
  });

  next();
}

/** Expose /metrics endpoint handler */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}
