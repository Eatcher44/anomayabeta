
-- Add commercial fields to animals table for breeder newborn management
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS commercial_status text DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_phone text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS deposit_received boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS planned_departure_date date,
  ADD COLUMN IF NOT EXISTS commercial_notes text;
