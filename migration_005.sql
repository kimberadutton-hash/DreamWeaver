-- Fix: Add missing UPDATE policy for archive_queries
-- Without this, RLS silently blocks conversation thread persistence in Ask the Archive

CREATE POLICY "Users can update own queries"
ON archive_queries
FOR UPDATE
USING (auth.uid() = user_id);
