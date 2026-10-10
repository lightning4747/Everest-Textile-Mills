-- Migration: 0002_inventory_core.sql
-- Create inventory enums, balances snapshot table, immutable movement ledger, and triggers.

DO $$ BEGIN
  CREATE TYPE "public"."inventory_item_type" AS ENUM('yarn', 'fabric', 'scrap');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."inventory_state" AS ENUM('raw_yarn', 'wip', 'fabric_pending_qc', 'finished_goods', 'scrap_fabric', 'scrap_yarn');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."movement_direction" AS ENUM('in', 'out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."movement_reason" AS ENUM(
    'receipt', 'reservation', 'unreservation', 'consumption',
    'roll_production', 'qc_pass', 'qc_reject', 'dispatch',
    'yield_variance', 'adjustment', 'cancellation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "item_type" "public"."inventory_item_type" NOT NULL,
  "item_id" varchar(80) NOT NULL,
  "sku_name" varchar(150) NOT NULL,
  "state" "public"."inventory_state" NOT NULL,
  "quantity" numeric(12, 2) NOT NULL DEFAULT '0',
  "reserved_quantity" numeric(12, 2) NOT NULL DEFAULT '0',
  "unit" varchar(20) NOT NULL,
  "location" varchar(80) NOT NULL DEFAULT 'Main Floor',
  "last_updated" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_inv_balance_item_state" UNIQUE ("item_id", "state"),
  CONSTRAINT "chk_balance_qty_non_neg" CHECK ("quantity" >= 0),
  CONSTRAINT "chk_balance_reserved_non_neg" CHECK ("reserved_quantity" >= 0),
  CONSTRAINT "chk_balance_avail_non_neg" CHECK ("quantity" >= "reserved_quantity")
);

CREATE INDEX IF NOT EXISTS "idx_inv_balance_state" ON "inventory_balances" ("state");
CREATE INDEX IF NOT EXISTS "idx_inv_balance_type" ON "inventory_balances" ("item_type");

CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "item_type" "public"."inventory_item_type" NOT NULL,
  "item_id" varchar(80) NOT NULL,
  "sku_name" varchar(150) NOT NULL,
  "state" "public"."inventory_state" NOT NULL,
  "direction" "public"."movement_direction" NOT NULL,
  "quantity" numeric(12, 2) NOT NULL,
  "quantity_delta" numeric(12, 2) NOT NULL,
  "reserved_delta" numeric(12, 2) DEFAULT '0' NOT NULL,
  "unit" varchar(20) NOT NULL,
  "reason" "public"."movement_reason" NOT NULL,
  "reference_type" varchar(40) NOT NULL,
  "reference_id" varchar(80) NOT NULL,
  "idempotency_key" varchar(120) UNIQUE,
  "actor" varchar(120) NOT NULL,
  "unit_cost_inr" numeric(10, 2),
  "total_cost_inr" numeric(12, 2),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_movement_qty_positive" CHECK ("quantity" > 0)
);

CREATE INDEX IF NOT EXISTS "idx_inv_mov_item_state" ON "inventory_movements" ("item_id", "state");
CREATE INDEX IF NOT EXISTS "idx_inv_mov_ref" ON "inventory_movements" ("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "idx_inv_mov_created" ON "inventory_movements" ("created_at" DESC);

-- Ensure a roll can never be dispatched twice
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_roll_single_shipment') THEN
    ALTER TABLE "dispatch_rolls" ADD CONSTRAINT "dispatch_roll_single_shipment" UNIQUE ("roll_id");
  END IF;
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Immutability enforcement trigger on inventory_movements
CREATE OR REPLACE FUNCTION prevent_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements is append-only: updates and deletes are prohibited';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_update_delete_inventory_movements ON "inventory_movements";
CREATE TRIGGER trg_no_update_delete_inventory_movements
BEFORE UPDATE OR DELETE ON "inventory_movements"
FOR EACH ROW EXECUTE FUNCTION prevent_movement_mutation();
