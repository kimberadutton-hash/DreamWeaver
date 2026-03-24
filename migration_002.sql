-- Migration 002: Analyst Focus + Individuation Narratives + Analyst Focus Privacy
-- Run in Supabase SQL Editor.

-- ── 1. Analyst Focuses ────────────────────────────────────────────────────────

create table if not exists analyst_focuses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  focus_text text not null,
  given_date date not null default current_date,
  end_date date,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table analyst_focuses enable row level security;

create policy "Users can view own focuses" on analyst_focuses
  for select using (auth.uid() = user_id);

create policy "Users can insert own focuses" on analyst_focuses
  for insert with check (auth.uid() = user_id);

create policy "Users can update own focuses" on analyst_focuses
  for update using (auth.uid() = user_id);

create policy "Users can delete own focuses" on analyst_focuses
  for delete using (auth.uid() = user_id);

create index if not exists analyst_focuses_user_id on analyst_focuses(user_id, is_active);

-- ── 2. Individuation Narratives ───────────────────────────────────────────────

create table if not exists individuation_narratives (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  narrative text not null,
  generated_at timestamptz default now(),
  dream_count int,
  last_dream_id uuid references dreams(id) on delete set null,
  is_current boolean default true
);

alter table individuation_narratives enable row level security;

create policy "Users can view own narratives" on individuation_narratives
  for select using (auth.uid() = user_id);

create policy "Users can insert own narratives" on individuation_narratives
  for insert with check (auth.uid() = user_id);

create policy "Users can update own narratives" on individuation_narratives
  for update using (auth.uid() = user_id);

create policy "Users can delete own narratives" on individuation_narratives
  for delete using (auth.uid() = user_id);

create index if not exists individuation_narratives_user_id on individuation_narratives(user_id, generated_at desc);

-- ── 3. Add share_analyst_focus_with_ai to privacy_settings default ────────────
-- Existing rows keep their jsonb as-is; the app merges over DEFAULTS so new
-- key is always present. This updates the column default for new signups.

alter table profiles
  alter column privacy_settings
  set default '{"share_notes_with_ai": false, "share_analyst_session_with_ai": false, "share_analyst_focus_with_ai": false}';
