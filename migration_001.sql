-- Dream Weaver — Migration 001
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (idempotent).

-- ── 1. New columns on dreams ────────────────────────────────────────────────

ALTER TABLE dreams ADD COLUMN IF NOT EXISTS is_big_dream boolean DEFAULT false;
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS incubation_intention text;
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS waking_resonances text[] DEFAULT '{}';
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS summary text;

-- series_id: self-referencing FK, nullable, SET NULL on parent delete
-- (ON DELETE SET NULL so deleting a dream never cascades to others in the series)
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS series_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'dreams_series_id_fkey'
      AND table_name = 'dreams'
  ) THEN
    ALTER TABLE dreams
      ADD CONSTRAINT dreams_series_id_fkey
      FOREIGN KEY (series_id) REFERENCES dreams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. Migrate mood from text → text[] ──────────────────────────────────────
-- Only runs if the mood column is still type text.
-- Converts "Anxious, Melancholic" → '{"Anxious","Melancholic"}'
-- NULL and empty strings become NULL.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'dreams'
      AND column_name = 'mood'
      AND data_type   = 'text'
  ) THEN
    -- Add temporary array column
    ALTER TABLE dreams ADD COLUMN mood_arr text[];

    -- Convert existing comma-separated strings to arrays
    UPDATE dreams
    SET mood_arr = CASE
      WHEN mood IS NULL OR trim(mood) = '' THEN NULL
      ELSE (
        SELECT array_agg(trim(elem))
        FROM unnest(string_to_array(mood, ',')) AS elem
        WHERE trim(elem) <> ''
      )
    END;

    -- Swap columns
    ALTER TABLE dreams DROP COLUMN mood;
    ALTER TABLE dreams RENAME COLUMN mood_arr TO mood;
  END IF;
END $$;

-- ── 3. privacy_settings on profiles (if not already added) ──────────────────
-- Added in a previous session; included here so the migration is self-contained.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb
  DEFAULT '{"share_notes_with_ai": false, "share_analyst_session_with_ai": false}';
