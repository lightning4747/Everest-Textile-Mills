import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok, created, notFound, conflict } from '../lib/response.js';
import { db } from '../db/index.js';
import { machines, machineStatusLog, machineOutputLog, salesOrders, productionOrders } from '../db/schema.js';
import { eq, sql, desc, and } from 'drizzle-orm';
import { updateProductionOutputGauge } from '../services/stubs.js';

const router = Router();
router.use(authenticate);

const createMachineSchema = z.object({
  id: z.string().min(1).max(10),
  name: z.string().min(1).max(120),
  type: z.enum(['spinning', 'weaving', 'dyeing']),
  daily_target: z.number().int().positive().optional(),
  dailyTarget: z.number().int().positive().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['running', 'idle', 'maintenance', 'breakdown']),
  operator: z.string().max(120).optional().nullable(),
  shift: z.enum(['A', 'B', 'C']).optional(),
  current_order_id: z.string().max(20).optional().nullable(),
  currentOrderId: z.string().max(20).optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
});

const logOutputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').default(() => new Date().toISOString().split('T')[0]),
  metres: z.number().int().min(0),
});

/** GET /api/v1/machines — List all machines with latest status log and today's output */
router.get('/', async (req, res, next) => {
  try {
    const { type, status } = req.query;

    const allMachines = await db.select().from(machines).orderBy(machines.id);

    // Latest status per machine
    const latestStatuses = await db
      .selectDistinctOn([machineStatusLog.machineId])
      .from(machineStatusLog)
      .orderBy(machineStatusLog.machineId, desc(machineStatusLog.recordedAt));

    const statusMap = new Map<string, (typeof latestStatuses)[0]>();
    for (const s of latestStatuses) {
      statusMap.set(s.machineId, s);
    }

    // Today's output per machine
    const today = new Date().toISOString().split('T')[0];
    const outputsToday = await db
      .select()
      .from(machineOutputLog)
      .where(eq(machineOutputLog.date, today));

    const outputMap = new Map<string, number>();
    for (const o of outputsToday) {
      outputMap.set(o.machineId, o.metres);
    }

    let result = allMachines.map((m) => {
      const s = statusMap.get(m.id);
      const currentStatus = s?.status ?? 'idle';
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        dailyTarget: m.dailyTarget,
        status: currentStatus,
        currentOrder: s?.currentOrderId ?? undefined,
        currentOrderId: s?.currentOrderId ?? null,
        operator: s?.operator ?? undefined,
        progress: s?.progress ?? 0,
        shift: s?.shift ?? 'A',
        outputToday: outputMap.get(m.id) ?? 0,
        createdAt: m.createdAt.toISOString(),
      };
    });

    if (type && typeof type === 'string') {
      result = result.filter((m) => m.type === type);
    }
    if (status && typeof status === 'string') {
      result = result.filter((m) => m.status === status);
    }

    ok(res, result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/machines/:id — Single machine with current status and history */
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!machine) {
      notFound(res, `Machine with ID '${id}' not found`);
      return;
    }

    const [latestStatus] = await db
      .select()
      .from(machineStatusLog)
      .where(eq(machineStatusLog.machineId, id))
      .orderBy(desc(machineStatusLog.recordedAt))
      .limit(1);

    const today = new Date().toISOString().split('T')[0];
    const [todayOutput] = await db
      .select()
      .from(machineOutputLog)
      .where(and(eq(machineOutputLog.machineId, id), eq(machineOutputLog.date, today)))
      .limit(1);

    const outputLogs = await db
      .select()
      .from(machineOutputLog)
      .where(eq(machineOutputLog.machineId, id))
      .orderBy(desc(machineOutputLog.date))
      .limit(30);

    ok(res, {
      id: machine.id,
      name: machine.name,
      type: machine.type,
      dailyTarget: machine.dailyTarget,
      status: latestStatus?.status ?? 'idle',
      currentOrder: latestStatus?.currentOrderId ?? undefined,
      currentOrderId: latestStatus?.currentOrderId ?? null,
      operator: latestStatus?.operator ?? undefined,
      progress: latestStatus?.progress ?? 0,
      shift: latestStatus?.shift ?? 'A',
      outputToday: todayOutput?.metres ?? 0,
      outputLogs: outputLogs.map((o) => ({
        id: o.id,
        date: o.date,
        metres: o.metres,
        updatedAt: o.updatedAt.toISOString(),
      })),
      createdAt: machine.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/machines — Register new machine (admin, manager) */
router.post('/', authorize('admin', 'manager'), validate(createMachineSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createMachineSchema>;

    const [existing] = await db
      .select({ id: machines.id })
      .from(machines)
      .where(eq(machines.id, body.id))
      .limit(1);

    if (existing) {
      conflict(res, `Machine with ID '${body.id}' already exists`);
      return;
    }

    const dailyTarget = body.dailyTarget ?? body.daily_target ?? 500;

    const [newMachine] = await db
      .insert(machines)
      .values({
        id: body.id,
        name: body.name,
        type: body.type,
        dailyTarget,
      })
      .returning();

    // Insert initial status log entry
    await db.insert(machineStatusLog).values({
      machineId: newMachine.id,
      status: 'idle',
      shift: 'A',
      progress: 0,
    });

    created(res, {
      id: newMachine.id,
      name: newMachine.name,
      type: newMachine.type,
      dailyTarget: newMachine.dailyTarget,
      status: 'idle',
      progress: 0,
      shift: 'A',
      outputToday: 0,
      createdAt: newMachine.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/v1/machines/:id/status — Record real-time machine status (admin, manager, operator) */
router.patch('/:id/status', authorize('admin', 'manager', 'operator'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body as z.infer<typeof updateStatusSchema>;

    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!machine) {
      notFound(res, `Machine with ID '${id}' not found`);
      return;
    }

    const [latest] = await db
      .select()
      .from(machineStatusLog)
      .where(eq(machineStatusLog.machineId, id))
      .orderBy(desc(machineStatusLog.recordedAt))
      .limit(1);

    // Business rule: breakdown or maintenance disassociates active order
    let currentOrderId: string | null = null;
    const previousOrderId = latest?.currentOrderId ?? null;

    if (body.status === 'breakdown' || body.status === 'maintenance') {
      currentOrderId = null;
    } else {
      currentOrderId = body.currentOrderId !== undefined
        ? body.currentOrderId
        : body.current_order_id !== undefined
        ? body.current_order_id
        : (body.status === 'idle' ? null : latest?.currentOrderId ?? null);
    }

    const operator = body.operator !== undefined ? body.operator : (latest?.operator ?? null);
    const shift = body.shift ?? (latest?.shift ?? 'A');
    const progress = body.progress !== undefined ? body.progress : (body.status === 'idle' ? 0 : latest?.progress ?? 0);

    const newLog = await db.transaction(async (tx) => {
      const [insertedLog] = await tx
        .insert(machineStatusLog)
        .values({
          machineId: id,
          status: body.status,
          operator,
          shift,
          currentOrderId,
          progress,
        })
        .returning();

      // If machine is entering breakdown or maintenance, clear machineId on active sales order and pause production order
      if ((body.status === 'breakdown' || body.status === 'maintenance') && previousOrderId) {
        await tx
          .update(salesOrders)
          .set({
            machineId: null,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, previousOrderId));

        await tx
          .update(productionOrders)
          .set({
            status: 'paused',
            updatedAt: new Date(),
          })
          .where(and(eq(productionOrders.salesOrderId, previousOrderId), eq(productionOrders.machineId, id)));
      }

      return insertedLog;
    });

    ok(res, {
      id: machine.id,
      name: machine.name,
      type: machine.type,
      dailyTarget: machine.dailyTarget,
      status: newLog.status,
      currentOrder: newLog.currentOrderId ?? undefined,
      currentOrderId: newLog.currentOrderId,
      operator: newLog.operator ?? undefined,
      progress: newLog.progress,
      shift: newLog.shift,
      recordedAt: newLog.recordedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/machines/:id/output-log — Output history by date range */
router.get('/:id/output-log', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { from, to } = req.query;

    const [machine] = await db
      .select({ id: machines.id })
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!machine) {
      notFound(res, `Machine with ID '${id}' not found`);
      return;
    }

    const conditions = [eq(machineOutputLog.machineId, id)];
    if (from && typeof from === 'string') {
      conditions.push(sql`${machineOutputLog.date} >= ${from}`);
    }
    if (to && typeof to === 'string') {
      conditions.push(sql`${machineOutputLog.date} <= ${to}`);
    }

    const rows = await db
      .select()
      .from(machineOutputLog)
      .where(and(...conditions))
      .orderBy(desc(machineOutputLog.date));

    const data = rows.map((r) => ({
      id: r.id,
      machineId: r.machineId,
      date: r.date,
      metres: r.metres,
      updatedAt: r.updatedAt.toISOString(),
    }));

    ok(res, data);
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/machines/:id/output — Log metres produced for today (admin, manager, operator) */
router.post('/:id/output', authorize('admin', 'manager', 'operator'), validate(logOutputSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = req.body as z.infer<typeof logOutputSchema>;

    const [machine] = await db
      .select({ id: machines.id })
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!machine) {
      notFound(res, `Machine with ID '${id}' not found`);
      return;
    }

    const [output] = await db
      .insert(machineOutputLog)
      .values({
        machineId: id,
        date: body.date,
        metres: body.metres,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [machineOutputLog.machineId, machineOutputLog.date],
        set: {
          metres: body.metres,
          updatedAt: new Date(),
        },
      })
      .returning();

    await updateProductionOutputGauge();

    created(res, {
      id: output.id,
      machineId: output.machineId,
      date: output.date,
      metres: output.metres,
      updatedAt: output.updatedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

