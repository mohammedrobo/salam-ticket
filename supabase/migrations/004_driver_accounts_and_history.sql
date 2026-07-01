-- Persistent driver accounts linked by device fingerprint
CREATE TABLE driver_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One row per completed delivery
CREATE TABLE delivery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_account_id UUID NOT NULL REFERENCES driver_accounts(id),
  office_id TEXT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (completed_at - scanned_at))::INT
  ) STORED
);

-- Link live queue entries to driver accounts
ALTER TABLE drivers ADD COLUMN driver_account_id UUID REFERENCES driver_accounts(id);

-- Fast lookups
CREATE INDEX idx_driver_accounts_device ON driver_accounts(device_id);
CREATE INDEX idx_delivery_history_account ON delivery_history(driver_account_id);
CREATE INDEX idx_delivery_history_office ON delivery_history(office_id, completed_at DESC);
CREATE INDEX idx_drivers_account ON drivers(driver_account_id);
