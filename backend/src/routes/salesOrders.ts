import { Router } from 'express';
import { z } from 'zod';
import { eq, or, ilike, desc, sql, count } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, notFound, badRequest } from '../lib/response.js';
import { db } from '../db/index.js';
import { salesOrders, machines, type SalesOrder, orderStatusEnum } from '../db/schema.js';
import { ordersCreatedTotal } from '../metrics.js';

const router = Router();
router.use(authenticate);

// ── Lifecycle stages ──────────────────────────────────────────────────────────
export const ORDER_STAGES = [
  { key: 'pending', label: 'Order Received' },
  { key: 'yarn_check', label: 'Yarn Check' },
  { key: 'spinning', label: 'Spinning' },
  { key: 'weaving', label: 'Weaving' },
  { key: 'dyeing', label: 'Dyeing' },
  { key: 'quality_check', label: 'Quality Check' },
  { key: 'ready_to_ship', label: 'Ready to Ship' },
  { key: 'dispatched', label: 'Dispatched' },
] as const;

type OrderStatus = (typeof ORDER_STAGES)[number]['key'];

const ORDER_STAGE_KEYS: [OrderStatus, ...OrderStatus[]] = [
  'pending',
  'yarn_check',
  'spinning',
  'weaving',
  'dyeing',
  'quality_check',
  'ready_to_ship',
  'dispatched',
];

// Helper to compute progress and formatted numbers
function formatSalesOrder(order: SalesOrder) {
  const quantityMetres = Number(order.quantityMetres);
  const completedMetres = Number(order.completedMetres);
  const unitPrice = Number(order.unitPrice);
  const progress = quantityMetres > 0 ? Math.round((completedMetres / quantityMetres) * 100) : 0;
  const value = quantityMetres * unitPrice;

  return {
    ...order,
    quantityMetres,
    completedMetres,
    unitPrice,
    progress,
    value,
  };
}

// ── Validation Schemas ────────────────────────────────────────────────────────
const listOrdersQuerySchema = z.object({
  q: z.string().optional(),
  buyer: z.string().optional(),
  status: z.enum(ORDER_STAGE_KEYS).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const createOrderSchema = z.object({
  buyer: z.string().trim().min(1, 'Buyer is required'),
  fabricType: z.string().trim().min(1, 'Fabric type is required'),
  colour: z.string().trim().min(1, 'Colour is required'),
  quantityMetres: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().positive('Unit price must be greater than 0'),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Delivery date must be YYYY-MM-DD'),
});

const updateStatusSchema = z.object({
  status: z.enum(ORDER_STAGE_KEYS),
});

/**
 * GET /api/v1/sales-orders
 * List sales orders with optional search (?q=), buyer filter, status filter, and pagination.
 */
router.get('/', validate(listOrdersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, buyer, status, page, limit } = req.query as unknown as z.infer<
      typeof listOrdersQuerySchema
    >;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status) {
      conditions.push(eq(salesOrders.status, status));
    }

    if (buyer) {
      conditions.push(ilike(salesOrders.buyer, `%${buyer}%`));
    }

    if (q) {
      conditions.push(
        or(
          ilike(salesOrders.id, `%${q}%`),
          ilike(salesOrders.buyer, `%${q}%`),
          ilike(salesOrders.fabricType, `%${q}%`),
          ilike(salesOrders.colour, `%${q}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const [totalRecord] = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(whereClause);

    const rows = await db
      .select()
      .from(salesOrders)
      .where(whereClause)
      .orderBy(desc(salesOrders.createdDate), desc(salesOrders.id))
      .limit(limit)
      .offset(offset);

    const data = rows.map(formatSalesOrder);
    ok(res, data, 200, {
      page,
      limit,
      total: totalRecord?.count ?? data.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sales-orders/:id
 * Get single order detail with stepper stages progression for tracking.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [order] = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.id, id))
      .limit(1);

    if (!order) {
      notFound(res, `Sales order with ID '${id}' not found`);
      return;
    }

    let machine = null;
    if (order.machineId) {
      const [m] = await db
        .select({ id: machines.id, name: machines.name, type: machines.type })
        .from(machines)
        .where(eq(machines.id, order.machineId))
        .limit(1);
      machine = m ?? null;
    }

    const currentStageIndex = ORDER_STAGES.findIndex((s) => s.key === order.status);

    const stages = ORDER_STAGES.map((stage, idx) => ({
      key: stage.key,
      label: stage.label,
      done: idx < currentStageIndex,
      current: idx === currentStageIndex,
    }));

    ok(res, {
      ...formatSalesOrder(order),
      machine,
      stages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/sales-orders
 * Create new sales order (admin, manager).
 * Generates next sequential ORD-NNNN ID.
 */
router.post(
  '/',
  authorize('admin', 'manager'),
  validate(createOrderSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createOrderSchema>;

      // Sequential ORD-NNNN generation using max existing ID
      const [latest] = await db
        .select({ id: salesOrders.id })
        .from(salesOrders)
        .where(sql`${salesOrders.id} ~ '^ORD-[0-9]+$'`)
        .orderBy(desc(sql`CAST(SUBSTRING(${salesOrders.id} FROM 5) AS INTEGER)`))
        .limit(1);

      let nextNumber = 1001;
      if (latest?.id) {
        const numPart = parseInt(latest.id.replace('ORD-', ''), 10);
        if (!isNaN(numPart)) {
          nextNumber = numPart + 1;
        }
      }
      const newId = `ORD-${nextNumber}`;

      const [inserted] = await db
        .insert(salesOrders)
        .values({
          id: newId,
          buyer: body.buyer,
          fabricType: body.fabricType,
          colour: body.colour,
          quantityMetres: String(body.quantityMetres),
          unitPrice: String(body.unitPrice),
          deliveryDate: body.deliveryDate,
          status: 'pending',
          completedMetres: '0',
        })
        .returning();

      ordersCreatedTotal.inc();

      created(res, formatSalesOrder(inserted));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/sales-orders/:id/status
 * Advance order status enforcing forward-only transitions.
 */
router.patch(
  '/:id/status',
  authorize('admin', 'manager'),
  validate(updateStatusSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const { status: targetStatus } = req.body as z.infer<typeof updateStatusSchema>;

      const [order] = await db
        .select()
        .from(salesOrders)
        .where(eq(salesOrders.id, id))
        .limit(1);

      if (!order) {
        notFound(res, `Sales order with ID '${id}' not found`);
        return;
      }

      const currentIndex = ORDER_STAGE_KEYS.indexOf(order.status as OrderStatus);
      const targetIndex = ORDER_STAGE_KEYS.indexOf(targetStatus);

      if (targetIndex <= currentIndex) {
        badRequest(
          res,
          `Invalid transition: order is currently '${order.status}' and cannot transition back or to the same status '${targetStatus}'`,
        );
        return;
      }

      const [updated] = await db
        .update(salesOrders)
        .set({
          status: targetStatus,
          updatedAt: new Date(),
        })
        .where(eq(salesOrders.id, id))
        .returning();

      ok(res, formatSalesOrder(updated));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
