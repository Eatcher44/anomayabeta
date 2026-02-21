
-- Add status and father fields to reproductions
ALTER TABLE public.reproductions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS father_animal_id uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS father_external_name text;

-- Add breeder_visible to animals (default true, newborns will be false)
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS breeder_visible boolean NOT NULL DEFAULT true;
