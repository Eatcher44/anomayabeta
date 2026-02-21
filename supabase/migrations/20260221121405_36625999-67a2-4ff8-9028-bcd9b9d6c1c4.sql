
CREATE TABLE public.heat_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  animal_id UUID NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.heat_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own heat_cycles" ON public.heat_cycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own heat_cycles" ON public.heat_cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own heat_cycles" ON public.heat_cycles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own heat_cycles" ON public.heat_cycles FOR DELETE USING (auth.uid() = user_id);
