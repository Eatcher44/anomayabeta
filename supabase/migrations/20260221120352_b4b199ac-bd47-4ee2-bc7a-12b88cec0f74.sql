
-- Reproduction records (saillie / mating) for female animals
CREATE TABLE public.reproductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  date_saillie DATE NOT NULL,
  notes TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reproductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reproductions" ON public.reproductions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reproductions" ON public.reproductions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reproductions" ON public.reproductions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reproductions" ON public.reproductions FOR DELETE USING (auth.uid() = user_id);

-- Litters linked to mother
CREATE TABLE public.litters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mother_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  reproduction_id UUID REFERENCES public.reproductions(id) ON DELETE SET NULL,
  birth_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.litters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own litters" ON public.litters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own litters" ON public.litters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own litters" ON public.litters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own litters" ON public.litters FOR DELETE USING (auth.uid() = user_id);

-- Add litter_id and mother_id columns to animals for newborn linking
ALTER TABLE public.animals ADD COLUMN litter_id UUID REFERENCES public.litters(id) ON DELETE SET NULL;
ALTER TABLE public.animals ADD COLUMN mother_id UUID REFERENCES public.animals(id) ON DELETE SET NULL;

-- Transfer codes for QR profile transfer
CREATE TABLE public.transfer_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_codes ENABLE ROW LEVEL SECURITY;

-- Creator can view/create their own codes
CREATE POLICY "Users can view their own transfer codes" ON public.transfer_codes FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can create transfer codes" ON public.transfer_codes FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update transfer codes" ON public.transfer_codes FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
