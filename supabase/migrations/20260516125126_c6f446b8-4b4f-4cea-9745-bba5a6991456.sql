CREATE TABLE public.pharmacy_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity_remaining NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  expiration_date DATE,
  low_stock_threshold NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pharmacy items"
  ON public.pharmacy_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pharmacy items"
  ON public.pharmacy_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pharmacy items"
  ON public.pharmacy_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pharmacy items"
  ON public.pharmacy_items FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_pharmacy_items_updated_at
  BEFORE UPDATE ON public.pharmacy_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pharmacy_items_user ON public.pharmacy_items(user_id);