// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, notFound, badRequest } from '../lib/response.js';
import { db } from '../db/index.js';
import { yarnStock, yarnReceipts, yarnTypeSuppliers, suppliers, appConfig } from '../db/schema.js';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { updateYarnLowStockGauge } from '../services/stubs.js';
import { inventoryService } from '../services/inventoryService.js';
import { allocationService } from '../services/allocationService.js';

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

const createReceiptSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').default(() => new Date().toISOString().split('T')[0]),
  supplier: z.string().optional(),
  supplier_name: z.string().optional(),
  supplierName: z.string().optional(),
  supplier_id: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  yarn_type: z.enum(['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended']).optional(),
  yarnType: z.enum(['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended']).optional(),
  colour: z.string().min(1).max(80),
  quantity_kg: z.number().positive().optional(),
  quantityKg: z.number().positive().optional(),
  yarn_stock_id: z.string().optional().nullable(),
  yarnStockId: z.string().optional().nullable(),
  for_order_id: z.string().optional().nullable(),
  forOrderId: z.string().optional().nullable(),
  purchase_order_id: z.string().optional().nullable(),
  purchaseOrderId: z.string().optional().nullable(),
  received_by: z.string().optional(),
  receivedBy: z.string().optional(),
  invoice_no: z.string().optional(),
  invoiceNo: z.string().optional(),
});

/** GET /api/v1/yarn/receipts — List historical yarn delivery records */
router.get('/receipts', async (req, res, next) => {
  try {
    const { from, to, supplier } = req.query;
    const conditions = [];

    if (from && typeof from === 'string') {
      conditions.push(sql`${yarnReceipts.date} >= ${from}`);
    }
    if (to && typeof to === 'string') {
      conditions.push(sql`${yarnReceipts.date} <= ${to}`);
    }
    if (supplier && typeof supplier === 'string') {
      conditions.push(sql`${yarnReceipts.supplierName} ILIKE ${'%' + supplier + '%'}`);
    }

    const rows = conditions.length > 0
      ? await db.select().from(yarnReceipts).where(and(...conditions)).orderBy(sql`${yarnReceipts.date} DESC`, sql`${yarnReceipts.createdAt} DESC`)
      : await db.select().from(yarnReceipts).orderBy(sql`${yarnReceipts.date} DESC`, sql`${yarnReceipts.createdAt} DESC`);

    const data = rows.map((r) => ({
      id: r.id,
      date: r.date,
      supplier: r.supplierName,
      supplierName: r.supplierName,
      supplierId: r.supplierId,
      yarnType: r.yarnType,
      colour: r.colour,
      quantityKg: Number(r.quantityKg),
      yarnStockId: r.yarnStockId,
      forOrderId: r.forOrderId ?? '',
      purchaseOrderId: r.purchaseOrderId ?? '',
      receivedBy: r.receivedBy,
      invoiceNo: r.invoiceNo,
      createdAt: r.createdAt.toISOString(),
    }));

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/yarn/receipts — Record yarn delivery with atomic inventory update (admin, manager, operator) */
router.post('/receipts', authorize('admin', 'manager', 'operator'), validate(createReceiptSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createReceiptSchema>;
    const supplierName = body.supplierName ?? body.supplier_name ?? body.supplier;
    const yarnType = body.yarnType ?? body.yarn_type;
    const quantityKg = body.quantityKg ?? body.quantity_kg;

    if (!supplierName) {
      badRequest(res, 'Supplier name is required');
      return;
    }
    if (!yarnType) {
      badRequest(res, 'Yarn type is required');
      return;
    }
    if (!quantityKg || quantityKg <= 0) {
      badRequest(res, 'Valid positive quantity in kg is required');
      return;
    }

    const date = body.date;
    const receivedBy = body.receivedBy ?? body.received_by ?? req.user?.name ?? 'Store Operator';
    const invoiceNo = body.invoiceNo ?? body.invoice_no ?? `INV-${Date.now().toString().slice(-6)}`;
    const forOrderId = (body.forOrderId || body.for_order_id) || null;

    const newReceipt = await db.transaction(async (tx) => {
      // 1. Generate receipt ID if not provided
      let receiptId = body.id;
      if (!receiptId) {
        const year = new Date(date).getFullYear();
        const prefix = `YR-${year}-`;
        const nextValRes = await tx.execute(sql<{ nextval: string }>`SELECT nextval('yarn_receipts_seq') as nextval;`);
        const nextNum = nextValRes.rows[0]?.nextval ?? Date.now();
        receiptId = `${prefix}${String(nextNum).padStart(3, '0')}`;
      }

      // 2. Resolve supplier ID if not provided
      let supplierId = (body.supplierId || body.supplier_id) || null;
      if (!supplierId && supplierName) {
        const [matchedSupplier] = await tx
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(eq(suppliers.name, supplierName))
          .limit(1);
        if (matchedSupplier) {
          supplierId = matchedSupplier.id;
        }
      }

      // 3. Resolve yarn stock ID if not provided
      let targetStockId = (body.yarnStockId || body.yarn_stock_id) || null;
      if (!targetStockId) {
        const [matchedStock] = await tx
          .select({ id: yarnStock.id })
          .from(yarnStock)
          .where(and(eq(yarnStock.type, yarnType), eq(yarnStock.colour, body.colour)))
          .limit(1);
        if (matchedStock) {
          targetStockId = matchedStock.id;
        }
      }

      // 4. Ensure yarn_stock bin exists if none was found
      if (!targetStockId) {
        const maxIdRes = await tx.execute(sql<{ max_num: number }>`
          SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) as max_num
          FROM yarn_stock
          WHERE id ~ '^YS-[0-9]+$'
        `);
        const nextNum = Number(maxIdRes.rows[0]?.max_num ?? 0) + 1;
        const newStockId = `YS-${String(nextNum).padStart(3, '0')}`;

        await tx.insert(yarnStock).values({
          id: newStockId,
          type: yarnType,
          colour: body.colour,
          quantityKg: '0.00',
          reorderLevel: '500.00',
          location: 'Staging Bay',
          lastUpdated: new Date(),
        });

        targetStockId = newStockId;
      }

      // 5. Atomic balance update and audit ledger write via central InventoryService
      await inventoryService.recordReceipt(tx, {
        yarnStockId: targetStockId,
        receiptKg: quantityKg,
        yarnType,
        colour: body.colour,
        actor: receivedBy,
        invoiceNo,
        receiptId,
        idempotencyKey: `rcv-${receiptId}-${Date.now()}`,
      });

      // 6. Insert yarn_receipts record
      const [inserted] = await tx
        .insert(yarnReceipts)
        .values({
          id: receiptId,
          date,
          supplierId,
          supplierName,
          yarnType,
          colour: body.colour,
          quantityKg: quantityKg.toFixed(2),
          yarnStockId: targetStockId,
          forOrderId,
          purchaseOrderId: body.purchaseOrderId || body.purchase_order_id || null,
          receivedBy,
          invoiceNo,
        })
        .returning();

      // 7. Auto-allocate newly arrived stock to waiting customer orders (FIFO queue)
      await allocationService.processRestockAllocation(tx, {
        yarnStockId: targetStockId,
        receivedKg: quantityKg,
        actor: receivedBy,
        yarnType,
        colour: body.colour,
      });

      return inserted;
    });

    await updateYarnLowStockGauge();

    created(res, {
      id: newReceipt.id,
      date: newReceipt.date,
      supplier: newReceipt.supplierName,
      supplierName: newReceipt.supplierName,
      supplierId: newReceipt.supplierId,
      yarnType: newReceipt.yarnType,
      colour: newReceipt.colour,
      quantityKg: Number(newReceipt.quantityKg),
      yarnStockId: newReceipt.yarnStockId,
      forOrderId: newReceipt.forOrderId ?? '',
      receivedBy: newReceipt.receivedBy,
      invoiceNo: newReceipt.invoiceNo,
      createdAt: newReceipt.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

const updateInspectionConfigSchema = z.object({
  damageWarningPct: z.number().nonnegative().max(100).optional(),
  damageRejectionPct: z.number().nonnegative().max(100).optional(),
  moistureMaxPct: z.number().nonnegative().max(100).optional(),
  damage_warning_pct: z.number().nonnegative().max(100).optional(),
  damage_rejection_pct: z.number().nonnegative().max(100).optional(),
  moisture_max_pct: z.number().nonnegative().max(100).optional(),
}).refine(data => {
  const warn = data.damageWarningPct ?? data.damage_warning_pct;
  const reject = data.damageRejectionPct ?? data.damage_rejection_pct;
  if (warn !== undefined && reject !== undefined) {
    return warn <= reject;
  }
  return true;
}, {
  message: 'Warning threshold cannot exceed rejection threshold',
  path: ['damageWarningPct'],
});

/** GET /api/v1/yarn/inspection/config — Get admin-configurable inspection thresholds */
router.get('/inspection/config', async (_req, res, next) => {
  try {
    const keys = ['yarn_qc_damage_warning_pct', 'yarn_qc_damage_rejection_pct', 'yarn_qc_moisture_max_pct'];
    const rows = await db.select().from(appConfig).where(inArray(appConfig.key, keys));
    const configMap = new Map(rows.map(r => [r.key, r.value]));

    const damageWarningPct = Number(configMap.get('yarn_qc_damage_warning_pct') ?? '30');
    const damageRejectionPct = Number(configMap.get('yarn_qc_damage_rejection_pct') ?? '40');
    const moistureMaxPct = Number(configMap.get('yarn_qc_moisture_max_pct') ?? '8.5');

    ok(res, {
      damageWarningPct,
      damageRejectionPct,
      moistureMaxPct,
    });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/v1/yarn/inspection/config — Update inspection thresholds (admin only) */
router.put('/inspection/config', authorize('admin'), validate(updateInspectionConfigSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const warn = body.damageWarningPct ?? body.damage_warning_pct;
    const reject = body.damageRejectionPct ?? body.damage_rejection_pct;
    const moisture = body.moistureMaxPct ?? body.moisture_max_pct;

    const entries: { key: string; value: string }[] = [];
    if (warn !== undefined) entries.push({ key: 'yarn_qc_damage_warning_pct', value: String(warn) });
    if (reject !== undefined) entries.push({ key: 'yarn_qc_damage_rejection_pct', value: String(reject) });
    if (moisture !== undefined) entries.push({ key: 'yarn_qc_moisture_max_pct', value: String(moisture) });

    for (const entry of entries) {
      await db
        .insert(appConfig)
        .values(entry)
        .onConflictDoUpdate({
          target: appConfig.key,
          set: { value: entry.value },
        });
    }

    const keys = ['yarn_qc_damage_warning_pct', 'yarn_qc_damage_rejection_pct', 'yarn_qc_moisture_max_pct'];
    const rows = await db.select().from(appConfig).where(inArray(appConfig.key, keys));
    const configMap = new Map(rows.map(r => [r.key, r.value]));

    ok(res, {
      damageWarningPct: Number(configMap.get('yarn_qc_damage_warning_pct') ?? '30'),
      damageRejectionPct: Number(configMap.get('yarn_qc_damage_rejection_pct') ?? '40'),
      moistureMaxPct: Number(configMap.get('yarn_qc_moisture_max_pct') ?? '8.5'),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
