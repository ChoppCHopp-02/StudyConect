-- 🔧 FIX SUPABASE RLS POLICIES FOR USERS TABLE (REGISTRATION & PROFILE UPDATES)
-- Paste this script directly into the Supabase SQL Editor (https://supabase.com) and click "Run".

-- 1. Enable INSERT policy for "users" table to allow new user registrations
DROP POLICY IF EXISTS "Allow insert users" ON users;
CREATE POLICY "Allow insert users" ON users 
  FOR INSERT WITH CHECK (true);

-- 2. Enable UPDATE policy for "users" table to allow profile edits
DROP POLICY IF EXISTS "Allow update users" ON users;
CREATE POLICY "Allow update users" ON users 
  FOR UPDATE USING (true);

-- 3. Ensure table privileges are active
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

SELECT '✅ Users RLS policies fixed successfully! Try updating your profile now.' as status;
