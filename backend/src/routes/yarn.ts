import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, notFound } from '../lib/response.js';
import { db } from '../db/index.js';
import { yarnStock, yarnTypeSuppliers, suppliers } from '../db/schema.js';
import { eq, sql, and } from 'drizzle-orm';
import { updateYarnLowStockGauge } from '../services/stubs.js';

const router = Router();
router.use(authenticate);

const patchStockSchema = z.object({
  quantity_kg: z.number().nonnegative().optional(),
  quantityKg: z.number().nonnegative().optional(),
  reorder_level: z.number().nonnegative().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  location: z.string().min(1).max(80).optional(),
});

/** GET /api/v1/yarn/stock — List all yarn stock with calculated low-stock alerts */
router.get('/stock', async (req, res, next) => {
  try {
    const { type, low_stock } = req.query;
    const conditions = [];

    if (type && typeof type === 'string') {
      conditions.push(eq(yarnStock.type, type as any));
    }
    if (low_stock === 'true') {
      conditions.push(sql`cast(${yarnStock.quantityKg} as numeric) <= cast(${yarnStock.reorderLevel} as numeric)`);
    }

    const rows = conditions.length > 0
      ? await db.select().from(yarnStock).where(and(...conditions)).orderBy(yarnStock.id)
      : await db.select().from(yarnStock).orderBy(yarnStock.id);

    const data = rows.map((r) => {
      const quantityKg = Number(r.quantityKg);
      const reorderLevel = Number(r.reorderLevel);
      return {
        id: r.id,
        type: r.type,
        colour: r.colour,
        quantityKg,
        reorderLevel,
        location: r.location,
        lastUpdated: r.lastUpdated.toISOString().split('T')[0],
        isLowStock: quantityKg <= reorderLevel,
      };
    });

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/yarn/stock/alerts — Low stock items linked with supplier contact info */
router.get('/stock/alerts', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(yarnStock)
      .where(sql`cast(${yarnStock.quantityKg} as numeric) <= cast(${yarnStock.reorderLevel} as numeric)`)
      .orderBy(yarnStock.id);

    const mappings = await db
      .select({
        yarnType: yarnTypeSuppliers.yarnType,
        supplierId: suppliers.id,
        name: suppliers.name,
        phone: suppliers.phone,
        email: suppliers.email,
      })
      .from(yarnTypeSuppliers)
      .innerJoin(suppliers, eq(yarnTypeSuppliers.supplierId, suppliers.id));

    const supplierMap = new Map<string, typeof mappings>();
    for (const m of mappings) {
      const list = supplierMap.get(m.yarnType) ?? [];
      list.push(m);
      supplierMap.set(m.yarnType, list);
    }

    const data = rows.map((r) => {
      const quantityKg = Number(r.quantityKg);
      const reorderLevel = Number(r.reorderLevel);
      const deficit = Math.max(0, reorderLevel - quantityKg);
      const severity = quantityKg <= reorderLevel * 0.4 ? 'critical' : 'warning';
      const typeSuppliers = supplierMap.get(r.type) ?? [];
      const primarySupplier = typeSuppliers[0];
      const supplierText = primarySupplier
        ? `${primarySupplier.name}${primarySupplier.phone ? ` · ${primarySupplier.phone}` : ''}`
        : 'No supplier listed';

      return {
        id: r.id,
        type: r.type,
        colour: r.colour,
        quantityKg,
        reorderLevel,
        location: r.location,
        lastUpdated: r.lastUpdated.toISOString().split('T')[0],
        deficit,
        severity,
        supplier: supplierText,
        suppliers: typeSuppliers.map((s) => ({
          id: s.supplierId,
          name: s.name,
          phone: s.phone,
          email: s.email,
        })),
      };
    });

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/v1/yarn/stock/:id — Adjust yarn stock bin location, quantity, or reorder level */
router.patch('/stock/:id', authorize('admin', 'manager'), validate(patchStockSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body as z.infer<typeof patchStockSchema>;

    const [existing] = await db.select().from(yarnStock).where(eq(yarnStock.id, id)).limit(1);
    if (!existing) {
      notFound(res, `Yarn stock with ID '${id}' not found`);
      return;
    }

    const qty = body.quantity_kg ?? body.quantityKg;
    const reorder = body.reorder_level ?? body.reorderLevel;

    const updateFields: Partial<typeof yarnStock.$inferInsert> = {
      lastUpdated: new Date(),
    };
    if (qty !== undefined) updateFields.quantityKg = qty.toFixed(2);
    if (reorder !== undefined) updateFields.reorderLevel = reorder.toFixed(2);
    if (body.location !== undefined) updateFields.location = body.location;

    const [updated] = await db
      .update(yarnStock)
      .set(updateFields)
      .where(eq(yarnStock.id, id))
      .returning();

    await updateYarnLowStockGauge();

    const quantityKg = Number(updated.quantityKg);
    const reorderLevel = Number(updated.reorderLevel);

    ok(res, {
      id: updated.id,
      type: updated.type,
      colour: updated.colour,
      quantityKg,
      reorderLevel,
      location: updated.location,
      lastUpdated: updated.lastUpdated.toISOString().split('T')[0],
      isLowStock: quantityKg <= reorderLevel,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/yarn/receipts */
router.get('/receipts', (_req, res) => {
  // TODO (Person A): list yarn receipts
  ok(res, { _stub: true, message: 'Yarn receipts list — not yet implemented' });
});

/** POST /api/v1/yarn/receipts */
router.post('/receipts', authorize('admin', 'manager', 'operator'), (_req, res) => {
  // TODO (Person A): record receipt and update yarn_stock quantity in a transaction
  ok(res, { _stub: true, message: 'Record yarn receipt — not yet implemented' }, 201);
});

export default router;
