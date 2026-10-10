/**
 * Dashboard routes — stub.
 * Person A owns this module.
 * Implements: GET /kpis, /monthly-chart, /qc-summary, /machine-health,
 *             /recent-orders, /low-stock
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ok } from '../lib/response.js';

const router = Router();

// All dashboard routes require auth
router.use(authenticate);

/** GET /api/v1/dashboard/kpis */
router.get('/kpis', (_req, res) => {
  // TODO (Person A): query DB for all KPI values
  ok(res, { _stub: true, message: 'Dashboard KPIs — not yet implemented' });
});

/** GET /api/v1/dashboard/monthly-chart */
router.get('/monthly-chart', (_req, res) => {
  // TODO (Person A): SELECT from monthly_snapshots ORDER BY year, month
  ok(res, { _stub: true, message: 'Monthly chart — not yet implemented' });
});

/** GET /api/v1/dashboard/qc-summary */
router.get('/qc-summary', (_req, res) => {
  // TODO (Person A): COUNT fabric_rolls GROUP BY qc_result
  ok(res, { _stub: true, message: 'QC summary — not yet implemented' });
});

/** GET /api/v1/dashboard/machine-health */
router.get('/machine-health', (_req, res) => {
  // TODO (Person A): latest status per machine, count by status
  ok(res, { _stub: true, message: 'Machine health — not yet implemented' });
});

/** GET /api/v1/dashboard/recent-orders */
router.get('/recent-orders', (_req, res) => {
  // TODO (Person A): SELECT 5 most recent sales_orders with progress%
  ok(res, { _stub: true, message: 'Recent orders — not yet implemented' });
});

/** GET /api/v1/dashboard/low-stock */
router.get('/low-stock', (_req, res) => {
  // TODO (Person A): yarn_stock WHERE quantity_kg <= reorder_level
  ok(res, { _stub: true, message: 'Low stock — not yet implemented' });
});

export default router;
