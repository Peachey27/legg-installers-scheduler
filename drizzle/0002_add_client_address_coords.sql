-- Adds persisted geocoding coordinates for client addresses (used for daily travel metrics).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_address_lat REAL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_address_lng REAL;

-- Material/product notes storage (if not already applied).
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS material_product_updates jsonb NOT NULL DEFAULT '[]';
