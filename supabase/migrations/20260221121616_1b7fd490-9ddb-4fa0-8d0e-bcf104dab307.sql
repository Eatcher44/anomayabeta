
ALTER TABLE public.litters ADD COLUMN father_id UUID REFERENCES public.animals(id) ON DELETE SET NULL;
ALTER TABLE public.litters ADD COLUMN father_name TEXT;
