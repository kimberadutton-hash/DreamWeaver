-- Run this in your Supabase SQL Editor

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  analyst_name text default 'Analyst',
  analyst_email text,
  dark_mode boolean default false,
  created_at timestamptz default now()
);

-- Dreams
create table if not exists dreams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  dream_date date not null default current_date,
  title text,
  body text not null,
  mood text,
  notes text,           -- My Notes — never sent to AI
  analyst_session text, -- Therapy notes
  tags text[],
  archetypes text[],
  symbols text[],
  reflection text,      -- AI Jungian reflection
  invitation text,      -- AI closing sentence
  has_analysis boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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

-- Index for performance
create index if not exists dreams_user_id_created_at on dreams(user_id, created_at desc);
create index if not exists dreams_user_id_dream_date on dreams(user_id, dream_date desc);
