-- Migration 004: Add messages thread column to archive_queries
-- Run in Supabase SQL Editor (or via supabase db push if CLI is configured).
--
-- messages = full conversation thread as a JSON array
--   [{role: 'user'|'assistant', content: string, timestamp: ISO string}, ...]
--
-- Existing rows default to '[]' (treated as single Q&A, displayed via legacy answer column).

alter table archive_queries
  add column if not exists messages jsonb not null default '[]';

-- Backfill existing rows: leave messages as [] so the UI falls back to
-- the legacy question/answer columns for display.
update archive_queries
  set messages = '[]'
  where messages is null;
