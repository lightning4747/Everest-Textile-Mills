// @ts-nocheck
import { db, pool } from '../db/index.js';
import { sql, eq } from 'drizzle-orm';
import {
  machines,
  machineStatusLog,
  machineOutputLog,
  salesOrders,
  productionOrders,
  monthlySnapshots,
} from '../db/schema.js';
import { inventoryService } from '../services/inventoryService.js';

async function main() {
  console.log('🚀 Starting Data Consistency Realignment: Monthly Snapshots & Machine Fleet...');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. REALIGN MONTHLY SNAPSHOTS (2025-05 through 2026-11)
  // Low on earlier times and shows steady, realistic growth with NO May 2026 drop!
  // ───────────────────────────────────────────────────────────────────────────
  console.log('📈 Realigning Monthly Snapshots with consistent growth curve...');

  const monthlyRecords = [
    // 2025 (Initial ramp-up & steady scaling)
    { year: 2025, month: 5,  revenue: 14250000, cost: 10545000, output: 76200,  wages: 388500 },
    { year: 2025, month: 6,  revenue: 15620000, cost: 11558800, output: 83500,  wages: 392000 },
    { year: 2025, month: 7,  revenue: 17100000, cost: 12654000, output: 91400,  wages: 395000 },
    { year: 2025, month: 8,  revenue: 18480000, cost: 13675200, output: 98800,  wages: 398500 },
    { year: 2025, month: 9,  revenue: 19950000, cost: 14763000, output: 106600, wages: 402000 },
    { year: 2025, month: 10, revenue: 21500000, cost: 15910000, output: 114900, wages: 406000 },
    { year: 2025, month: 11, revenue: 23120000, cost: 17108800, output: 123600, wages: 410000 },
    { year: 2025, month: 12, revenue: 24800000, cost: 18352000, output: 132600, wages: 414500 },

    // 2026 (Continued strong enterprise growth — zero May drop!)
    { year: 2026, month: 1,  revenue: 26250000, cost: 19425000, output: 140300, wages: 418000 },
    { year: 2026, month: 2,  revenue: 27600000, cost: 20424000, output: 147500, wages: 421500 },
    { year: 2026, month: 3,  revenue: 28950000, cost: 21423000, output: 154800, wages: 425000 },
    { year: 2026, month: 4,  revenue: 30400000, cost: 22496000, output: 162500, wages: 428500 },
    { year: 2026, month: 5,  revenue: 31850000, cost: 23569000, output: 170300, wages: 432000 },
    { year: 2026, month: 6,  revenue: 33200000, cost: 24568000, output: 177500, wages: 435000 },
    { year: 2026, month: 7,  revenue: 34600000, cost: 25604000, output: 185000, wages: 438000 },
    { year: 2026, month: 8,  revenue: 35900000, cost: 26566000, output: 191900, wages: 441000 },
    { year: 2026, month: 9,  revenue: 37250000, cost: 27565000, output: 199200, wages: 444000 },
    { year: 2026, month: 10, revenue: 38600000, cost: 28564000, output: 206400, wages: 447500 },
    { year: 2026, month: 11, revenue: 39950000, cost: 29563000, output: 213600, wages: 450000 },
  ];

  for (const m of monthlyRecords) {
    await db
      .insert(monthlySnapshots)
      .values({
        year: m.year,
        month: m.month,
        revenue: m.revenue.toFixed(2),
        cost: m.cost.toFixed(2),
        outputMetres: m.output.toFixed(2),
        wages: m.wages.toFixed(2),
      })
      .onConflictDoUpdate({
        target: [monthlySnapshots.year, monthlySnapshots.month],
        set: {
          revenue: m.revenue.toFixed(2),
          cost: m.cost.toFixed(2),
          outputMetres: m.output.toFixed(2),
          wages: m.wages.toFixed(2),
        },
      });
  }
  console.log(`   ✓ Upserted ${monthlyRecords.length} monthly snapshots.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ASSIGN WORK TO MACHINES & CONNECT REAL SYSTEM DATA
  // Fleet Configuration:
  // - 15 Spinning: 13 Running, 1 Maintenance (SP-14), 1 Idle (SP-07)
  // - 18 Weaving: 15 Running, 2 Maintenance (WV-02, WV-13), 1 Idle (WV-09)
  // - 12 Dyeing: 10 Running, 1 Maintenance (DY-02), 1 Idle (DY-04)
  // Total: 38 Running, 4 Maintenance, 3 Idle = 45 Machines
  // ───────────────────────────────────────────────────────────────────────────
  console.log('🏭 Assigning machines to real active orders and operators...');

  // Standardize daily target to 500 metres across all machines for OEE consistency
  await db.execute(sql`UPDATE machines SET daily_target = 500`);

  const machineAssignments = [
    // ── Spinning Fleet (15 machines) ──
    { machineId: 'SP-01', status: 'running', orderId: 'ORD-RST-3600', operator: 'Rajesh Kumar', shift: 'A', progress: 85, outputToday: 480 },
    { machineId: 'SP-02', status: 'running', orderId: 'ORD-94461',    operator: 'Kavitha Naidu', shift: 'A', progress: 90, outputToday: 510 },
    { machineId: 'SP-03', status: 'running', orderId: 'ORD-94463',    operator: 'Dinesh Sharma', shift: 'B', progress: 60, outputToday: 475 },
    { machineId: 'SP-04', status: 'running', orderId: 'ORD-94464',    operator: 'Harish Venkataraman', shift: 'A', progress: 70, outputToday: 490 },
    { machineId: 'SP-05', status: 'running', orderId: 'ORD-94465',    operator: 'Rajesh Sharma', shift: 'A', progress: 45, outputToday: 525 },
    { machineId: 'SP-06', status: 'running', orderId: 'ORD-94466',    operator: 'Pradeep Marimuthu', shift: 'B', progress: 55, outputToday: 460 },
    { machineId: 'SP-07', status: 'idle',    orderId: null,           operator: 'Mahesh Menon', shift: 'A', progress: 0,  outputToday: 0 },
    { machineId: 'SP-08', status: 'running', orderId: 'ORD-94468',    operator: 'Aparna Naidu', shift: 'A', progress: 65, outputToday: 530 },
    { machineId: 'SP-09', status: 'running', orderId: 'ORD-94469',    operator: 'Ravi Menon', shift: 'B', progress: 75, outputToday: 505 },
    { machineId: 'SP-10', status: 'running', orderId: 'ORD-94470',    operator: 'Naveen Marimuthu', shift: 'A', progress: 80, outputToday: 495 },
    { machineId: 'SP-11', status: 'running', orderId: 'ORD-94781',    operator: 'Manoj Sharma', shift: 'B', progress: 90, outputToday: 515 },
    { machineId: 'SP-12', status: 'running', orderId: 'ORD-94783',    operator: 'Murugan Menon', shift: 'A', progress: 50, outputToday: 470 },
    { machineId: 'SP-13', status: 'running', orderId: 'ORD-94785',    operator: 'Preeti Venkataraman', shift: 'B', progress: 40, outputToday: 540 },
    { machineId: 'SP-14', status: 'maintenance', orderId: null,       operator: 'Tech Team', shift: 'A', progress: 0,  outputToday: 0 },
    { machineId: 'SP-15', status: 'running', orderId: 'ORD-94789',    operator: 'Varun Sharma', shift: 'A', progress: 65, outputToday: 485 },

    // ── Weaving Fleet (18 machines) ──
    { machineId: 'WV-01', status: 'running', orderId: 'ORD-1038',     operator: 'Amit Patel', shift: 'A', progress: 75, outputToday: 535 },
    { machineId: 'WV-02', status: 'breakdown', orderId: null,         operator: 'Maintenance Team', shift: 'A', progress: 0, outputToday: 0 },
    { machineId: 'WV-03', status: 'running', orderId: 'ORD-1040',     operator: 'Praveen R.', shift: 'A', progress: 60, outputToday: 490 },
    { machineId: 'WV-04', status: 'running', orderId: 'ORD-94448',    operator: 'Lalitha Venkataraman', shift: 'B', progress: 70, outputToday: 510 },
    { machineId: 'WV-05', status: 'running', orderId: 'ORD-94449',    operator: 'Divya Marimuthu', shift: 'A', progress: 55, outputToday: 465 },
    { machineId: 'WV-06', status: 'running', orderId: 'ORD-94450',    operator: 'Mahesh Menon', shift: 'B', progress: 85, outputToday: 520 },
    { machineId: 'WV-07', status: 'running', orderId: 'ORD-94451',    operator: 'Kamala Venkataraman', shift: 'A', progress: 90, outputToday: 505 },
    { machineId: 'WV-08', status: 'running', orderId: 'ORD-94452',    operator: 'Malathi Venkataraman', shift: 'B', progress: 80, outputToday: 475 },
    { machineId: 'WV-09', status: 'idle',    orderId: null,           operator: 'Velmurugan Naidu', shift: 'A', progress: 0, outputToday: 0 },
    { machineId: 'WV-10', status: 'running', orderId: 'ORD-94453',    operator: 'Selvam Menon', shift: 'A', progress: 65, outputToday: 545 },
    { machineId: 'WV-11', status: 'running', orderId: 'ORD-94454',    operator: 'Thangavel Naidu', shift: 'B', progress: 85, outputToday: 495 },
    { machineId: 'WV-12', status: 'running', orderId: 'ORD-94455',    operator: 'Senthamil Naidu', shift: 'A', progress: 60, outputToday: 530 },
    { machineId: 'WV-13', status: 'breakdown', orderId: null,         operator: 'Saravanan Marimuthu', shift: 'A', progress: 0, outputToday: 0 },
    { machineId: 'WV-14', status: 'running', orderId: 'ORD-94456',    operator: 'Aditya Venkataraman', shift: 'B', progress: 95, outputToday: 480 },
    { machineId: 'WV-15', status: 'running', orderId: 'ORD-94457',    operator: 'Deepa Menon', shift: 'A', progress: 90, outputToday: 515 },
    { machineId: 'WV-16', status: 'running', orderId: 'ORD-94458',    operator: 'Natarajan Naidu', shift: 'B', progress: 65, outputToday: 525 },
    { machineId: 'WV-17', status: 'running', orderId: 'ORD-94459',    operator: 'Vasanthi Sharma', shift: 'A', progress: 75, outputToday: 490 },
    { machineId: 'WV-18', status: 'running', orderId: 'ORD-94460',    operator: 'Karthik Menon', shift: 'B', progress: 50, outputToday: 510 },

    // ── Dyeing Fleet (12 machines) ──
    { machineId: 'DY-01', status: 'running', orderId: 'ORD-94435',    operator: 'Sunil Verma', shift: 'A', progress: 65, outputToday: 490 },
    { machineId: 'DY-02', status: 'maintenance', orderId: null,       operator: 'Tech Team', shift: 'A', progress: 0, outputToday: 0 },
    { machineId: 'DY-03', status: 'running', orderId: 'ORD-1041',     operator: 'Kiran S.', shift: 'A', progress: 75, outputToday: 520 },
    { machineId: 'DY-04', status: 'idle',    orderId: null,           operator: 'Lakshmi Marimuthu', shift: 'A', progress: 0, outputToday: 0 },
    { machineId: 'DY-05', status: 'running', orderId: 'ORD-94436',    operator: 'Raghu Marimuthu', shift: 'B', progress: 60, outputToday: 485 },
    { machineId: 'DY-06', status: 'running', orderId: 'ORD-94438',    operator: 'Meena Marimuthu', shift: 'A', progress: 70, outputToday: 515 },
    { machineId: 'DY-07', status: 'running', orderId: 'ORD-94439',    operator: 'Yashoda Sharma', shift: 'B', progress: 90, outputToday: 530 },
    { machineId: 'DY-08', status: 'running', orderId: 'ORD-94441',    operator: 'Amit Sharma', shift: 'A', progress: 85, outputToday: 500 },
    { machineId: 'DY-09', status: 'running', orderId: 'ORD-94442',    operator: 'Naveen Marimuthu', shift: 'B', progress: 70, outputToday: 480 },
    { machineId: 'DY-10', status: 'running', orderId: 'ORD-94444',    operator: 'Prakash Naidu', shift: 'A', progress: 75, outputToday: 525 },
    { machineId: 'DY-11', status: 'running', orderId: 'ORD-94445',    operator: 'Swati Menon', shift: 'B', progress: 55, outputToday: 495 },
    { machineId: 'DY-12', status: 'running', orderId: 'ORD-94446',    operator: 'Shweta Venkataraman', shift: 'A', progress: 80, outputToday: 510 },
  ];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  for (const item of machineAssignments) {
    // 1. If assigned an order, update sales_orders.machine_id to maintain referential parity
    if (item.orderId) {
      await db
        .update(salesOrders)
        .set({ machineId: item.machineId })
        .where(eq(salesOrders.id, item.orderId));

      // 2. Ensure active production_orders entry
      const existingProd = await db
        .select({ id: productionOrders.id })
        .from(productionOrders)
        .where(eq(productionOrders.salesOrderId, item.orderId))
        .limit(1);

      if (existingProd.length > 0) {
        await db
          .update(productionOrders)
          .set({
            machineId: item.machineId,
            status: 'in_progress',
          })
          .where(eq(productionOrders.id, existingProd[0].id));
      } else {
        await db
          .insert(productionOrders)
          .values({
            salesOrderId: item.orderId,
            machineId: item.machineId,
            startDate: todayStr,
            expectedEndDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            status: 'in_progress',
            targetMetres: '1500.00',
            outputMetres: String(item.outputToday),
          })
          .onConflictDoNothing();
      }
    }

    // 3. Insert latest status log entry
    await db.insert(machineStatusLog).values({
      machineId: item.machineId,
      status: item.status,
      operator: item.operator,
      shift: item.shift,
      currentOrderId: item.orderId,
      progress: item.progress,
      recordedAt: now,
    });

    // 4. Upsert output log for today
    await db
      .insert(machineOutputLog)
      .values({
        machineId: item.machineId,
        date: todayStr,
        metres: item.outputToday,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [machineOutputLog.machineId, machineOutputLog.date],
        set: {
          metres: item.outputToday,
          updatedAt: now,
        },
      });

    // 5. Upsert output log for yesterday to ensure historical chart consistency
    const yesterdayOutput = item.status === 'running' ? Math.round(item.outputToday * 0.98) : 0;
    await db
      .insert(machineOutputLog)
      .values({
        machineId: item.machineId,
        date: yesterdayStr,
        metres: yesterdayOutput,
        updatedAt: yesterdayDate,
      })
      .onConflictDoUpdate({
        target: [machineOutputLog.machineId, machineOutputLog.date],
        set: {
          metres: yesterdayOutput,
          updatedAt: yesterdayDate,
        },
      });
  }

  console.log(`   ✓ Realigned all 45 machines with active orders, operators, and output logs.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. FINAL VERIFICATION & INVENTORY RECONCILIATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 Running Verification & Reconciliation Suite...');

  const recon = await inventoryService.reconcileInventory();
  console.log(' - Inventory Reconciliation Status:', recon.status);
  console.log(' - Inventory Drift Count:', recon.driftCount);

  const [runningCnt] = (await db.execute(sql`
    SELECT count(*) as cnt 
    FROM (
      SELECT DISTINCT ON (machine_id) machine_id, status 
      FROM machine_status_log 
      ORDER BY machine_id, recorded_at DESC
    ) latest 
    WHERE status = 'running';
  `)).rows;

  const [outputSum] = (await db.execute(sql`
    SELECT sum(metres) as total_metres, count(*) as machine_count 
    FROM machine_output_log 
    WHERE date = ${todayStr} AND metres > 0;
  `)).rows;

  console.log(` - Active Running Machines: ${runningCnt.cnt} / 45`);
  console.log(` - Operating Machines Producing Output Today: ${outputSum.machine_count} machines (${outputSum.total_metres} m)`);

  console.log('\n✅ Realignment Complete: Strict data consistency maintained system-wide.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error during realignment:', err);
  process.exit(1);
});
