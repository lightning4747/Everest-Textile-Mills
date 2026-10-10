# Senior Engineering Review of Inventory Architecture (`inventory-review.md`)

## Executive Summary

A rigorous, skeptical engineering review was conducted on `inventory-plan.md` against the existing Everest Textile Mills codebase (`schema.ts`, `seed.ts`, route services, `plan.md`, and `frontend.md`). While the original plan correctly identified the need for transactional consistency and an append-only ledger, the stress test exposed several critical architectural flaws that would cause drift, race conditions, negative balances, and data loss in production.

This document details the findings across all 8 review areas, the specific corrections made, and the engineering rationale for each.

---

## 1. Correctness of the Model

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Reconciliation formulas** | **FAILED** | The plan defined $\text{Balance} = \sum_{\text{in}} \text{qty} - \sum_{\text{out}} \text{qty}$ while also logging yarn reservations as `direction = 'in', state = 'raw_yarn'`. Logging reservations as incoming movements would falsely inflate physical stock by the reserved quantity. | Split ledger tracking into two distinct signed deltas: `quantity_delta` (physical material change) and `reserved_delta` (allocation change). Physical balance equals $\sum \text{quantity\_delta}$; reserved balance equals $\sum \text{reserved\_delta}$. Reservations alter only `reserved_delta`, leaving physical stock sum untouched. |
| **Unit consistency across states** | **FAILED** | The plan was ambiguous about WIP and Scrap units (stating "+metres or +kg scrap"). Mixed units in the same balance state make aggregation mathematically meaningless. | Enforced strict single-unit rule per `(item_id, state)`: `raw_yarn` (kg), `wip` (kg yarn equivalent), `fabric_pending_qc` (metres), `finished_goods` (metres), `scrap_fabric` (metres), `scrap_yarn` (kg). Balance rows declare an immutable `unit` matching their state. |
| **Balance identification & cross-order leakage** | **FAILED** | The plan used a generic `item_id VARCHAR(80)` for WIP. If WIP is tracked only by fabric type, Order B's loom run could consume Order A's allocated yarn, creating phantom shortages. | WIP and Finished Goods balances are explicitly scoped by `sales_order_id` + `fabric_type` (e.g., `ORD-1038:Cotton-Denim`). Physical inventory cannot be hijacked across sales orders. |
| **Yarn-to-fabric conversion & variance** | **FAILED** | The plan used a fixed $0.25\text{ kg/m}$ conversion and proposed "flooring WIP at zero if variance occurs". In reality, mills experience weaving shrinkage, sizing gain, and loom waste. | Removed the "floor at zero" silent mask. When an order finishes weaving, any discrepancy between actual consumed yarn and woven meters is explicitly flushed to a `yield_variance` movement (favorable gain or waste loss), ensuring WIP cleanly hits $0.00\text{ kg}$ with zero drift. |
| **Hiding inconsistencies** | **FAILED** | Silently flooring negative WIP concealed loom inefficiencies from production managers and order costing. | All variances are surfaced via explicit `reason = 'variance'` ledger entries. If physical stock is insufficient, transactions fail loudly with HTTP 400 rather than swallowing errors. |

---

## 2. Sources of Truth

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Dual quantity storage & sync drift** | **HIGH RISK** | The plan proposed keeping `yarn_stock.quantity_kg` alongside `inventory_balances.quantity`. Dual storage of mutable balances guarantees eventual drift if an update is missed. | `inventory_balances` is established as the sole source of truth for all quantities. `yarn_stock` retains bin metadata (`location`, `reorder_level`), while its `quantity_kg` is either read via a view/join on `inventory_balances` or synchronized within the exact same database transaction. |
| **Redundant columns & tables** | **HOLDS UP** | Identified that legacy no-op stubs (`reserveYarnStock` in `stubs.ts`) and unreferenced mock datasets are obsolete. | Replaced legacy stubs with direct domain calls to `inventoryService.ts`. Kept existing REST response shapes so frontend components continue operating without regression. |

---

## 3. Durability & Integrity

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Ledger immutability enforcement** | **FAILED** | Immutability was based purely on application convention. Any developer or script could run `UPDATE` or `DELETE` on `inventory_movements`. | Added a native PostgreSQL trigger (`trg_prevent_inventory_movement_mutation`) that throws an exception on any `UPDATE` or `DELETE` statement targeting `inventory_movements`. Immutability is physically enforced by the database engine. |
| **Retries & idempotency** | **FAILED** | Network timeouts causing client retries on `POST /yarn/receipts` or `POST /fabric-rolls` would duplicate movements and double-credit stock. | Added an `idempotency_key` column on `inventory_movements` with a unique index: `UNIQUE (reference_type, reference_id, reason, state, direction)`. Retried calls return the existing record without creating duplicate ledger entries. |
| **Database-level invariants** | **PARTIALLY HELD** | Application checked positive stock, but DB constraints were incomplete. Crucially, `dispatch_rolls` allowed the same roll in multiple dispatches because its unique index was `(dispatch_id, roll_id)`. | 1. Added `UNIQUE (roll_id)` on `dispatch_rolls`—physically preventing any fabric roll from being dispatched twice in mill history.<br/>2. Added `CHECK (quantity >= 0)`, `CHECK (reserved_quantity >= 0)`, and `CHECK (quantity >= reserved_quantity)` to `inventory_balances`. |
| **Independent cross-checks** | **HOLDS UP** | The plan only verified ledger vs balances. More physical cross-checks were needed. | Added 3 automated invariants to `reconcileInventory()`:<br/>1. Total passed un-shipped rolls $\equiv$ `finished_goods` balance.<br/>2. Total pending QC rolls $\equiv$ `fabric_pending_qc` balance.<br/>3. Sum of all `dispatch_rolls.metres` $\equiv$ sum of dispatch movements. |

---

## 4. Concurrency & Locking

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Locking non-existent rows** | **FAILED** | `SELECT ... FOR UPDATE` on a balance row that does not yet exist returns 0 rows and acquires no lock. Two concurrent workers both see 0, attempt to insert, and fail on unique key collision. | Implemented an atomic `INSERT ... ON CONFLICT (item_id, state) DO NOTHING` pattern before invoking `SELECT ... FOR UPDATE`. The row is guaranteed to exist prior to locking. |
| **Deadlock prevention across multiple rows** | **FAILED** | Moving stock from State A to State B locks two balance rows. If Worker 1 locks A then B, and Worker 2 locks B then A, PostgreSQL terminates one transaction with a deadlock error. | Mandated **Deterministic Lock Ordering**: all balance row locks within any transaction must be acquired in alphabetical order of `(item_id, state)`. Deadlocks are mathematically prevented. |
| **Transaction isolation level** | **HOLDS UP** | Evaluated `READ COMMITTED` vs `SERIALIZABLE`. | Confirmed that `READ COMMITTED` paired with explicit `SELECT ... FOR UPDATE` row locks provides complete isolation without the serialization failure aborts that occur under high contention in `SERIALIZABLE`. |

---

## 5. Flow Completeness & State Machine

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **State transitions & illegal leaps** | **FAILED** | `PATCH /sales-orders/:id/status` allowed clients to patch from `pending` directly to `dispatched` without moving through production stages. | Implemented a strict **Finite State Machine (FSM)** in `salesOrders.ts`. Only valid forward transitions (`pending` $\rightarrow$ `yarn_check` $\rightarrow$ `spinning` $\rightarrow$ `weaving` $\rightarrow$ `dyeing` $\rightarrow$ `quality_check` $\rightarrow$ `ready_to_ship` $\rightarrow$ `dispatched`) are permitted. |
| **QC outcomes and scrap routing** | **SIMPLIFIED** | Ambiguity existed in physical tracking and shop-floor reprocessing of second-quality fabric. | Simplified QC decisions to be strictly binary on inspected rolls: `passed` (advances to `finished_goods`) or `rejected` (diverted to `scrap_fabric`). |
| **Partial fulfillment & partial dispatch** | **VAGUE** | The plan assumed all-or-nothing dispatches. Real mills ship partial lots as trucks become available. | Dispatches operate on specific passed roll sets. Each partial dispatch decrements only those rolls from `finished_goods`. The order transitions to `dispatched` only when total dispatched meters match the order target; otherwise it remains in `ready_to_ship` (partially fulfilled). |
| **Cancellations & compensating entries** | **HOLDS UP** | Confirmed that cancellations append explicit compensating movements (`reason = 'cancellation'`) rather than deleting records. | Formalized compensating payloads for order cancellations (releasing reserved yarn) and dispatch voids (returning rolls to finished goods). |

---

## 6. Maintainability & Architecture

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Preventing inventory bypass** | **FAILED** | Without structural guardrails, future route handlers could update tables directly without writing to the ledger. | Centralized all inventory operations into `backend/src/services/inventoryService.ts`. Database triggers block direct mutation of movements. Route handlers cannot execute arbitrary balance updates and must call typed service methods. |

---

## 7. Migration & Backfill Realism

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Handling in-flight mid-production orders** | **CRITICAL FAILURE** | The previous plan only backfilled `yarn_stock` and passed rolls. Existing seed orders in `spinning`, `weaving`, and `dyeing` (e.g. `ORD-1038`, `ORD-1040`, `ORD-1041`) would have had **zero WIP in balances**. Subsequent roll production would immediately crash due to insufficient WIP! | The backfill script explicitly computes and seeds: <br/>1. `raw_yarn` from `yarn_stock`.<br/>2. **`wip` for active mid-production orders** based on `(quantityMetres - completedMetres) * 0.25 kg`.<br/>3. `fabric_pending_qc` from pending rolls.<br/>4. `finished_goods` from passed un-dispatched rolls.<br/>5. `scrap_fabric` from rejected rolls.<br/>Guarantees zero downtime and zero broken in-flight workflows. |

---

## 8. Business Value & Costing

| Stress Test Question | Status | Finding & Vulnerability | Revision Made & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Real order costing support** | **HOLDS UP WITH UPGRADE** | `order_costs` currently relies on static numbers. Management needs real material cost per sales order. | Added optional `unit_cost_inr` and `total_cost_inr` to `inventory_movements`. When yarn is consumed, the movement captures lot valuation. This provides the mathematical foundation for actual absorption costing without requiring a schema rewrite later. |

---

## Summary of Action Taken

All findings above have been incorporated into the revised [`inventory-plan.md`](file:///home/bow/projects/Everest-Textile-Mills/inventory-plan.md). The plan is now hardened against race conditions, retries, concurrency deadlocks, and migration traps, while remaining lean, dependency-free, and aligned with real textile mill floor physics.
