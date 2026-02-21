
-- Transfer archive: stores snapshot of transferred animals for breeder read-only access
CREATE TABLE public.transfer_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_owner_id uuid NOT NULL,
  animal_id uuid NOT NULL,
  animal_name text NOT NULL,
  animal_photo text,
  animal_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  transfer_code_id uuid REFERENCES public.transfer_codes(id) ON DELETE SET NULL
);

ALTER TABLE public.transfer_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transfer archive"
  ON public.transfer_archive FOR SELECT
  USING (auth.uid() = original_owner_id);

CREATE POLICY "Users can create their own transfer archive"
  ON public.transfer_archive FOR INSERT
  WITH CHECK (auth.uid() = original_owner_id);

-- Index for fast lookup
CREATE INDEX idx_transfer_archive_owner ON public.transfer_archive(original_owner_id);
CREATE INDEX idx_transfer_archive_animal ON public.transfer_archive(animal_id);
