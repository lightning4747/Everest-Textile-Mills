-- Migration: 0003_person_b_features.sql
-- Integrates Person B multi-fabric sales orders, products catalog, and client portal roles/enums

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'awaiting_yarn';
ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'yarn_check';

DO $$ BEGIN
  CREATE TYPE "public"."item_status" AS ENUM (
    'pending', 'awaiting_yarn', 'confirmed', 'spinning', 'weaving', 'dyeing',
    'quality_check', 'ready_to_ship', 'dispatched'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."sales_orders" ADD COLUMN IF NOT EXISTS "client_id" uuid REFERENCES "public"."users"("id");
ALTER TABLE "public"."sales_orders" ADD COLUMN IF NOT EXISTS "total_amount" numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "public"."sales_orders" ALTER COLUMN "fabric_type" DROP NOT NULL;
ALTER TABLE "public"."sales_orders" ALTER COLUMN "colour" DROP NOT NULL;
ALTER TABLE "public"."sales_orders" ALTER COLUMN "quantity_metres" DROP NOT NULL;
ALTER TABLE "public"."sales_orders" ALTER COLUMN "unit_price" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "public"."products" (
  "id" varchar(20) PRIMARY KEY,
  "name" varchar(120) NOT NULL,
  "fabric_type" varchar(120) NOT NULL,
  "gsm" integer NOT NULL,
  "width_inches" integer NOT NULL,
  "yarn_type" "public"."yarn_type" NOT NULL,
  "yarn_kg_per_metre" numeric(10, 4) NOT NULL,
  "price_per_metre" numeric(10, 2) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."sales_order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" varchar(20) NOT NULL REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE,
  "sequence" integer NOT NULL,
  "product_id" varchar(20) NOT NULL REFERENCES "public"."products"("id"),
  "quantity_metres" numeric(10, 2) NOT NULL,
  "unit_price" numeric(10, 2) NOT NULL,
  "yarn_kg_per_metre" numeric(10, 4) NOT NULL,
  "status" "public"."item_status" NOT NULL DEFAULT 'pending',
  "completed_metres" numeric(10, 2) NOT NULL DEFAULT 0,
  "dispatched_metres" numeric(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "public"."dispatch_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dispatch_id" varchar(20) NOT NULL REFERENCES "public"."dispatches"("id") ON DELETE CASCADE,
  "sales_order_item_id" uuid NOT NULL REFERENCES "public"."sales_order_items"("id"),
  "metres" numeric(10, 2) NOT NULL
);
