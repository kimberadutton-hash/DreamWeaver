-- Add modal_associations column to dreams table
ALTER TABLE dreams
  ADD COLUMN IF NOT EXISTS modal_associations jsonb;

-- No RLS changes needed — dreams table RLS already covers all columns
