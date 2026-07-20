CREATE TABLE personal_associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  subject_type text not null check (subject_type in ('figure', 'symbol', 'dynamic')),
  synthesis text,
  synthesis_generated_at timestamptz,
  dream_sources jsonb default '[]'::jsonb,
  last_dream_added_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE personal_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal associations"
  ON personal_associations
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own personal associations"
  ON personal_associations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own personal associations"
  ON personal_associations
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own personal associations"
  ON personal_associations
  FOR DELETE
  USING (user_id = auth.uid());
