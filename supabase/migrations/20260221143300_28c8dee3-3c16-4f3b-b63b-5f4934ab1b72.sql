
-- Create breeder_profiles table
CREATE TABLE public.breeder_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  nom_elevage TEXT,
  prenom TEXT,
  nom TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  siret TEXT,
  logo_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.breeder_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own breeder profile"
ON public.breeder_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own breeder profile"
ON public.breeder_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own breeder profile"
ON public.breeder_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own breeder profile"
ON public.breeder_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_breeder_profiles_updated_at
BEFORE UPDATE ON public.breeder_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
