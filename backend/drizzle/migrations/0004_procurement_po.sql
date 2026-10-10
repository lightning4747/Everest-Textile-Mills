DO $$ BEGIN
  CREATE TYPE po_status AS ENUM ('draft', 'issued', 'partially_received', 'received', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE SEQUENCE IF NOT EXISTS purchase_orders_seq START WITH 1;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(30) PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name VARCHAR(200) NOT NULL,
  delivery_date DATE,
  status po_status NOT NULL DEFAULT 'issued',
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id VARCHAR(30) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  yarn_stock_id VARCHAR(20) REFERENCES yarn_stock(id),
  yarn_type yarn_type NOT NULL,
  colour VARCHAR(80) NOT NULL,
  ordered_kg NUMERIC(10, 2) NOT NULL,
  received_kg NUMERIC(10, 2) NOT NULL DEFAULT '0',
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS restock_allocation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id VARCHAR(30) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sales_order_id VARCHAR(20) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE CASCADE,
  yarn_stock_id VARCHAR(20) NOT NULL REFERENCES yarn_stock(id),
  shortfall_kg NUMERIC(10, 2) NOT NULL,
  allocated_kg NUMERIC(10, 2) NOT NULL DEFAULT '0',
  is_satisfied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE yarn_receipts ADD COLUMN IF NOT EXISTS purchase_order_id VARCHAR(30) REFERENCES purchase_orders(id);
