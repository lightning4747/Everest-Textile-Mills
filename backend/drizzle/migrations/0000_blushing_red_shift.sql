CREATE TYPE "public"."dispatch_status" AS ENUM('prepared', 'loaded', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."machine_shift" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."machine_status" AS ENUM('running', 'idle', 'maintenance', 'breakdown');--> statement-breakpoint
CREATE TYPE "public"."machine_type" AS ENUM('spinning', 'weaving', 'dyeing');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'yarn_check', 'spinning', 'weaving', 'dyeing', 'quality_check', 'ready_to_ship', 'dispatched');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('queued', 'in_progress', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."qc_result" AS ENUM('passed', 'rejected', 'pending');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'operator', 'qc_inspector', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."yarn_type" AS ENUM('Cotton', 'Polyester', 'Wool', 'Silk', 'Blended');--> statement-breakpoint
CREATE TABLE "app_config" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_rolls" (
	"dispatch_id" varchar(20) NOT NULL,
	"roll_id" varchar(20) NOT NULL,
	CONSTRAINT "dispatch_roll_unique" UNIQUE("dispatch_id","roll_id")
);
--> statement-breakpoint
CREATE TABLE "dispatches" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"order_id" varchar(20) NOT NULL,
	"buyer" varchar(200) NOT NULL,
	"total_metres" numeric(10, 2) NOT NULL,
	"dispatch_date" date NOT NULL,
	"invoice_no" varchar(80) NOT NULL,
	"truck_no" varchar(40) NOT NULL,
	"status" "dispatch_status" DEFAULT 'prepared' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fabric_rolls" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"order_id" varchar(20) NOT NULL,
	"machine_id" varchar(10) NOT NULL,
	"metres" numeric(8, 2) NOT NULL,
	"produced_date" date NOT NULL,
	"qc_result" "qc_result" DEFAULT 'pending' NOT NULL,
	"defects" jsonb,
	"checked_by" varchar(120),
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_output_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" varchar(10) NOT NULL,
	"date" date NOT NULL,
	"metres" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machine_output_unique" UNIQUE("machine_id","date")
);
--> statement-breakpoint
CREATE TABLE "machine_status_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" varchar(10) NOT NULL,
	"status" "machine_status" NOT NULL,
	"operator" varchar(120),
	"shift" "machine_shift" NOT NULL,
	"current_order_id" varchar(20),
	"progress" smallint DEFAULT 0 NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "machine_type" NOT NULL,
	"daily_target" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"output_metres" numeric(14, 2) DEFAULT '0' NOT NULL,
	"wages" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_snapshot_unique" UNIQUE("year","month")
);
--> statement-breakpoint
CREATE TABLE "order_costs" (
	"order_id" varchar(20) PRIMARY KEY NOT NULL,
	"buyer" varchar(200) NOT NULL,
	"yarn_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"labour_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"machine_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_order_id" varchar(20) NOT NULL,
	"machine_id" varchar(10) NOT NULL,
	"start_date" date NOT NULL,
	"expected_end_date" date NOT NULL,
	"status" "production_status" DEFAULT 'queued' NOT NULL,
	"output_metres" numeric(10, 2) DEFAULT '0' NOT NULL,
	"target_metres" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_orders_sales_order_id_unique" UNIQUE("sales_order_id")
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"buyer" varchar(200) NOT NULL,
	"fabric_type" varchar(120) NOT NULL,
	"colour" varchar(80) NOT NULL,
	"quantity_metres" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"delivery_date" date NOT NULL,
	"created_date" date DEFAULT CURRENT_DATE NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"machine_id" varchar(10),
	"completed_metres" numeric(10, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(30),
	"email" varchar(200),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "yarn_receipts" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"supplier_id" uuid,
	"supplier_name" varchar(200) NOT NULL,
	"yarn_type" "yarn_type" NOT NULL,
	"colour" varchar(80) NOT NULL,
	"quantity_kg" numeric(10, 2) NOT NULL,
	"yarn_stock_id" varchar(20),
	"for_order_id" varchar(20),
	"received_by" varchar(120) NOT NULL,
	"invoice_no" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yarn_stock" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"type" "yarn_type" NOT NULL,
	"colour" varchar(80) NOT NULL,
	"quantity_kg" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(10, 2) DEFAULT '0' NOT NULL,
	"location" varchar(80) NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yarn_type_suppliers" (
	"yarn_type" "yarn_type" NOT NULL,
	"supplier_id" uuid NOT NULL,
	CONSTRAINT "yarn_supplier_unique" UNIQUE("yarn_type","supplier_id")
);
--> statement-breakpoint
ALTER TABLE "dispatch_rolls" ADD CONSTRAINT "dispatch_rolls_dispatch_id_dispatches_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_rolls" ADD CONSTRAINT "dispatch_rolls_roll_id_fabric_rolls_id_fk" FOREIGN KEY ("roll_id") REFERENCES "public"."fabric_rolls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_rolls" ADD CONSTRAINT "fabric_rolls_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_rolls" ADD CONSTRAINT "fabric_rolls_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_output_log" ADD CONSTRAINT "machine_output_log_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_status_log" ADD CONSTRAINT "machine_status_log_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_costs" ADD CONSTRAINT "order_costs_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarn_receipts" ADD CONSTRAINT "yarn_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarn_receipts" ADD CONSTRAINT "yarn_receipts_yarn_stock_id_yarn_stock_id_fk" FOREIGN KEY ("yarn_stock_id") REFERENCES "public"."yarn_stock"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarn_receipts" ADD CONSTRAINT "yarn_receipts_for_order_id_sales_orders_id_fk" FOREIGN KEY ("for_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarn_type_suppliers" ADD CONSTRAINT "yarn_type_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;