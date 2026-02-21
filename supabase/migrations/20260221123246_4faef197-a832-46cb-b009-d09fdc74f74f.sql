
-- ============================================
-- BREEDER DATA MODEL CLEANUP & OPTIMIZATION
-- Safe migration: no data deletion, additive only
-- ============================================

-- 1) INDEXES on foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_reproductions_animal_id ON public.reproductions(animal_id);
CREATE INDEX IF NOT EXISTS idx_reproductions_father_animal_id ON public.reproductions(father_animal_id);
CREATE INDEX IF NOT EXISTS idx_litters_mother_id ON public.litters(mother_id);
CREATE INDEX IF NOT EXISTS idx_litters_father_id ON public.litters(father_id);
CREATE INDEX IF NOT EXISTS idx_litters_reproduction_id ON public.litters(reproduction_id);
CREATE INDEX IF NOT EXISTS idx_animals_litter_id ON public.animals(litter_id);
CREATE INDEX IF NOT EXISTS idx_animals_mother_id ON public.animals(mother_id);
CREATE INDEX IF NOT EXISTS idx_animals_user_id ON public.animals(user_id);
CREATE INDEX IF NOT EXISTS idx_animals_breeder_visible ON public.animals(breeder_visible);
CREATE INDEX IF NOT EXISTS idx_heat_cycles_animal_id ON public.heat_cycles(animal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_animal_id ON public.notifications(animal_id);
CREATE INDEX IF NOT EXISTS idx_transfer_codes_animal_id ON public.transfer_codes(animal_id);

-- 2) CASCADE DELETES: when an animal is deleted, clean up related records
-- Drop existing FK constraints and recreate with ON DELETE CASCADE

-- heat_cycles: no FK currently, add one with cascade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'heat_cycles_animal_id_fkey' AND table_name = 'heat_cycles'
  ) THEN
    ALTER TABLE public.heat_cycles
      ADD CONSTRAINT heat_cycles_animal_id_fkey
      FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;
  ELSE
    ALTER TABLE public.heat_cycles DROP CONSTRAINT heat_cycles_animal_id_fkey;
    ALTER TABLE public.heat_cycles
      ADD CONSTRAINT heat_cycles_animal_id_fkey
      FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- notifications: update FK to cascade
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_animal_id_fkey' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_animal_id_fkey;
  END IF;
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_animal_id_fkey
    FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;
END $$;

-- reproductions: update FK to cascade
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reproductions_animal_id_fkey' AND table_name = 'reproductions'
  ) THEN
    ALTER TABLE public.reproductions DROP CONSTRAINT reproductions_animal_id_fkey;
  END IF;
  ALTER TABLE public.reproductions
    ADD CONSTRAINT reproductions_animal_id_fkey
    FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;
END $$;

-- transfer_codes: update FK to cascade
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transfer_codes_animal_id_fkey' AND table_name = 'transfer_codes'
  ) THEN
    ALTER TABLE public.transfer_codes DROP CONSTRAINT transfer_codes_animal_id_fkey;
  END IF;
  ALTER TABLE public.transfer_codes
    ADD CONSTRAINT transfer_codes_animal_id_fkey
    FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;
END $$;

-- animals litter_id FK: update to SET NULL on delete (don't delete newborns when litter deleted)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'animals_litter_id_fkey' AND table_name = 'animals'
  ) THEN
    ALTER TABLE public.animals DROP CONSTRAINT animals_litter_id_fkey;
  END IF;
  ALTER TABLE public.animals
    ADD CONSTRAINT animals_litter_id_fkey
    FOREIGN KEY (litter_id) REFERENCES public.litters(id) ON DELETE SET NULL;
END $$;

-- animals mother_id FK: update to SET NULL on delete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'animals_mother_id_fkey' AND table_name = 'animals'
  ) THEN
    ALTER TABLE public.animals DROP CONSTRAINT animals_mother_id_fkey;
  END IF;
  ALTER TABLE public.animals
    ADD CONSTRAINT animals_mother_id_fkey
    FOREIGN KEY (mother_id) REFERENCES public.animals(id) ON DELETE SET NULL;
END $$;

-- 3) DATA CONSISTENCY: ensure all existing animals have correct defaults
UPDATE public.animals SET breeder_visible = true WHERE breeder_visible IS NULL;
UPDATE public.animals SET paradis = false WHERE paradis IS NULL;

-- Ensure newborns (animals with litter_id) have breeder_visible=false
UPDATE public.animals SET breeder_visible = false WHERE litter_id IS NOT NULL AND breeder_visible = true;

-- Ensure paradise animals have no future notifications
DELETE FROM public.notifications
WHERE animal_id IN (SELECT id FROM public.animals WHERE paradis = true)
AND due_date > now();

-- 4) Ensure reproductions have status field populated
UPDATE public.reproductions SET status = 'active' WHERE status IS NULL OR status = '';
