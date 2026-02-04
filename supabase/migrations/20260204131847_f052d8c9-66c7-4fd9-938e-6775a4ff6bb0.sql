-- Table des animaux
CREATE TABLE public.animals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  sexe TEXT NOT NULL,
  race TEXT,
  photo TEXT,
  naissance DATE,
  sterilise BOOLEAN DEFAULT FALSE,
  puce TEXT,
  poids JSONB DEFAULT '[]'::jsonb,
  soins JSONB DEFAULT '[]'::jsonb,
  consultations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des rendez-vous
CREATE TABLE public.rendezvous (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  heure TEXT,
  objet TEXT NOT NULL,
  notes TEXT,
  animal_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendezvous ENABLE ROW LEVEL SECURITY;

-- RLS Policies for animals
CREATE POLICY "Users can view their own animals" 
ON public.animals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own animals" 
ON public.animals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own animals" 
ON public.animals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own animals" 
ON public.animals FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for rendezvous
CREATE POLICY "Users can view their own rendezvous" 
ON public.rendezvous FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rendezvous" 
ON public.rendezvous FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rendezvous" 
ON public.rendezvous FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rendezvous" 
ON public.rendezvous FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_animals_updated_at
BEFORE UPDATE ON public.animals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();