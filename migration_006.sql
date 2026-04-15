-- Add resonance and refinement columns to dreams table
ALTER TABLE dreams
  ADD COLUMN IF NOT EXISTS resonance_score integer CHECK (resonance_score >= 1 AND resonance_score <= 5),
  ADD COLUMN IF NOT EXISTS resonance_note text,
  ADD COLUMN IF NOT EXISTS analysis_stage text DEFAULT 'complete'
    CHECK (analysis_stage IN ('complete', 'refined'));

-- No RLS changes needed — dreams table RLS already covers all columns
