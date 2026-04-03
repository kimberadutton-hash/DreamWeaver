create table if not exists shadow_theme_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  theme_name text not null,
  notes jsonb not null default '[]',
  updated_at timestamptz default now(),
  unique(user_id, theme_name)
);

alter table shadow_theme_notes enable row level security;

create policy "Users can manage their own shadow theme notes"
  on shadow_theme_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
