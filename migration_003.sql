-- Migration 003: Add narrative_version to individuation_narratives
-- Run in Supabase SQL Editor.
--
-- narrative_version = 1  →  plain-text narrative (legacy)
-- narrative_version = 2  →  JSON structured narrative (chapter view)
--
-- Existing rows default to 1 (treated as legacy plain text).
-- New rows inserted by the app will include narrative_version = 2.

alter table individuation_narratives
  add column if not exists narrative_version int not null default 1;

-- Mark any existing rows explicitly as version 1 (safe to run multiple times)
update individuation_narratives
  set narrative_version = 1
  where narrative_version is null or narrative_version = 1;
