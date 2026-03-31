-- Dream Weaver — Full Schema
-- Run this in your Supabase SQL Editor for a fresh install.
-- For existing installs, run migration_001.sql instead.

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  analyst_name text default 'Analyst',
  analyst_email text,
  dark_mode boolean default false,
  privacy_settings jsonb default '{"share_notes_with_ai": false, "share_analyst_session_with_ai": false}',
  created_at timestamptz default now()
);

-- Dreams
create table if not exists dreams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  dream_date date not null default current_date,
  title text,
  body text not null,
  mood text[],                   -- Array of mood strings e.g. '{"Anxious","Melancholic"}'
  notes text,                    -- My Notes — never sent to AI by default
  analyst_session text,          -- Therapy session notes
  incubation_intention text,     -- Intention set before sleeping
  tags text[],
  archetypes text[],
  symbols text[],
  waking_resonances text[] default '{}', -- Moments where dream symbols appeared in waking life
  reflection text,               -- AI Jungian reflection
  invitation text,               -- AI closing sentence
  summary text,                  -- AI-generated 2-3 sentence summary (used in archive queries)
  is_big_dream boolean default false,    -- Numinous / archetypal dream of unusual significance
  series_id uuid,                -- Self-referencing FK for dream series (SET NULL on delete)
  has_analysis boolean default false,
  last_analyzed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (series_id) references dreams(id) on delete set null
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dreams_updated_at
  before update on dreams
  for each row execute procedure update_updated_at();

-- Row Level Security
alter table profiles enable row level security;
alter table dreams enable row level security;

-- Profile policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Dream policies
create policy "Users can view own dreams" on dreams
  for select using (auth.uid() = user_id);

create policy "Users can insert own dreams" on dreams
  for insert with check (auth.uid() = user_id);

create policy "Users can update own dreams" on dreams
  for update using (auth.uid() = user_id);

create policy "Users can delete own dreams" on dreams
  for delete using (auth.uid() = user_id);

-- Saved archive queries (Ask Your Archive — saved responses)
create table if not exists archive_queries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamptz default now()
);

alter table archive_queries enable row level security;

create policy "Users can view own queries" on archive_queries
  for select using (auth.uid() = user_id);

create policy "Users can insert own queries" on archive_queries
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own queries" on archive_queries
  for delete using (auth.uid() = user_id);

create index if not exists archive_queries_user_id on archive_queries(user_id, created_at desc);

-- Personal recurring themes (AI-generated from dream archive)
create table if not exists user_themes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  themes jsonb not null,
  generated_at timestamptz default now(),
  dream_count_at_generation int
);

alter table user_themes enable row level security;

create policy "Users can view own themes" on user_themes
  for select using (auth.uid() = user_id);

create policy "Users can insert own themes" on user_themes
  for insert with check (auth.uid() = user_id);

create policy "Users can update own themes" on user_themes
  for update using (auth.uid() = user_id);

create policy "Users can delete own themes" on user_themes
  for delete using (auth.uid() = user_id);

-- Analyst focuses (questions/themes given by analyst to hold between sessions)
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

-- Individuation narratives (AI-generated Jungian journey narrative, versioned)
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

-- Active imagination sessions
create table if not exists imagination_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  figure_name text not null,
  figure_description text,
  linked_dream_id uuid references dreams(id) on delete set null,
  messages jsonb not null default '[]',
  session_date date default current_date,
  closed_at timestamptz,
  closing_reflection text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table imagination_sessions enable row level security;

create policy "Users can view own sessions" on imagination_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own sessions" on imagination_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions" on imagination_sessions
  for update using (auth.uid() = user_id);

create policy "Users can delete own sessions" on imagination_sessions
  for delete using (auth.uid() = user_id);

create index if not exists imagination_sessions_user_id on imagination_sessions(user_id, created_at desc);

create trigger imagination_sessions_updated_at
  before update on imagination_sessions
  for each row execute procedure update_updated_at();

-- Waking life entries
create table if not exists waking_life_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  entry_date date not null default current_date,
  entry_type text not null,
  title text not null,
  description text,
  media_url text,
  media_type text,
  media_filename text,
  linked_dream_id uuid references dreams(id) on delete set null,
  linked_focus_id uuid references analyst_focuses(id) on delete set null,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table waking_life_entries enable row level security;

create policy "Users can view own entries" on waking_life_entries
  for select using (auth.uid() = user_id);

create policy "Users can insert own entries" on waking_life_entries
  for insert with check (auth.uid() = user_id);

create policy "Users can update own entries" on waking_life_entries
  for update using (auth.uid() = user_id);

create policy "Users can delete own entries" on waking_life_entries
  for delete using (auth.uid() = user_id);

create index if not exists waking_life_entries_user_id on waking_life_entries(user_id, entry_date desc);

create trigger waking_life_entries_updated_at
  before update on waking_life_entries
  for each row execute procedure update_updated_at();

-- Indexes for performance
create index if not exists dreams_user_id_created_at on dreams(user_id, created_at desc);
create index if not exists dreams_user_id_dream_date on dreams(user_id, dream_date desc);
