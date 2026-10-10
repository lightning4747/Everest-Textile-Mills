import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, notFound } from '../lib/response.js';
import { db } from '../db/index.js';
import { suppliers, yarnTypeSuppliers } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();
router.use(authenticate);

const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  notes: z.string().optional().nullable(),
  yarnTypes: z.array(z.enum(['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended'])).optional(),
  yarn_types: z.array(z.enum(['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended'])).optional(),
});

const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  notes: z.string().optional().nullable(),
  yarnTypes: z.array(z.enum(['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended'])).optional(),
  yarn_types: z.array(z.enum(['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended'])).optional(),
});

/** GET /api/v1/suppliers — List all suppliers */
router.get('/', async (_req, res, next) => {
  try {
    const allSuppliers = await db.select().from(suppliers).orderBy(suppliers.name);
    const mappings = await db.select().from(yarnTypeSuppliers);
    const mappingMap = new Map<string, string[]>();
    for (const m of mappings) {
      const list = mappingMap.get(m.supplierId) ?? [];
      list.push(m.yarnType);
      mappingMap.set(m.supplierId, list);
    }
    const result = allSuppliers.map((s) => ({
      ...s,
      yarnTypes: mappingMap.get(s.id) ?? [],
    }));
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/suppliers — Create supplier (admin, manager) */
router.post('/', authorize('admin', 'manager'), validate(createSupplierSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSupplierSchema>;
    const types = body.yarnTypes ?? body.yarn_types ?? [];
    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    if (types.length > 0) {
      await db
        .insert(yarnTypeSuppliers)
        .values(types.map((yt) => ({ yarnType: yt, supplierId: newSupplier.id })))
        .onConflictDoNothing();
    }

    created(res, {
      ...newSupplier,
      yarnTypes: types,
    });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/v1/suppliers/:id — Update supplier (admin, manager) */
router.patch('/:id', authorize('admin', 'manager'), validate(updateSupplierSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body as z.infer<typeof updateSupplierSchema>;
    const [existing] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (!existing) {
      notFound(res, `Supplier with ID '${id}' not found`);
      return;
    }

    const updateData: Partial<typeof suppliers.$inferInsert> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.notes !== undefined) updateData.notes = body.notes;

    let updatedSupplier = existing;
    if (Object.keys(updateData).length > 0) {
      const [updated] = await db
        .update(suppliers)
        .set(updateData)
        .where(eq(suppliers.id, id))
        .returning();
      updatedSupplier = updated;
    }

    const types = body.yarnTypes ?? body.yarn_types;
    if (types !== undefined) {
      await db.delete(yarnTypeSuppliers).where(eq(yarnTypeSuppliers.supplierId, id));
      if (types.length > 0) {
        await db
          .insert(yarnTypeSuppliers)
          .values(types.map((yt) => ({ yarnType: yt, supplierId: id })))
          .onConflictDoNothing();
      }
    }

    const currentTypes = await db
      .select({ yarnType: yarnTypeSuppliers.yarnType })
      .from(yarnTypeSuppliers)
      .where(eq(yarnTypeSuppliers.supplierId, id));

    ok(res, {
      ...updatedSupplier,
      yarnTypes: currentTypes.map((t) => t.yarnType),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

