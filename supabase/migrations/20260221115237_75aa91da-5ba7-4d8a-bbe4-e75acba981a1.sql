
-- Add paradis (archived) column to animals table
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS paradis boolean NOT NULL DEFAULT false;
