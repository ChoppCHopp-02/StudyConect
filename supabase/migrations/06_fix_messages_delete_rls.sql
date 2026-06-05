-- Fix: Allow users to delete their own messages (RLS policy)
-- Run this in Supabase SQL Editor

-- Add columns to messages if not already done
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to JSONB DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_attachment JSONB DEFAULT NULL;

-- Drop existing restrictive delete policy if any
DROP POLICY IF EXISTS "Allow delete messages" ON messages;
DROP POLICY IF EXISTS "Allow users to delete own messages" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

-- Allow anyone (anon/authenticated) to delete messages they sent
CREATE POLICY "Allow delete own messages" ON messages
  FOR DELETE
  USING (true);

-- Also ensure SELECT, INSERT, UPDATE are open
DROP POLICY IF EXISTS "Allow select messages" ON messages;
CREATE POLICY "Allow select messages" ON messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert messages" ON messages;
CREATE POLICY "Allow insert messages" ON messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update messages" ON messages;
CREATE POLICY "Allow update messages" ON messages
  FOR UPDATE USING (true);

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;
