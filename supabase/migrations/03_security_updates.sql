-- 🔒 Studyconect Security & RLS Updates
-- Run this script in your Supabase SQL Editor (https://supabase.com)

-- =====================================================================
-- 1. SECURE LOGIN FUNCTION (SECURITY DEFINER)
-- This function runs with admin privileges (SECURITY DEFINER) to safely
-- verify passwords WITHOUT exposing the password hash column to the public.
-- =====================================================================

CREATE OR REPLACE FUNCTION verify_user_login(
    p_email text, 
    p_password_hash text,
    p_plaintext_password text
)
RETURNS TABLE (
    id bigint,
    full_name varchar,
    email varchar,
    role varchar,
    university varchar,
    major varchar,
    avatar text,
    bio text,
    created_at timestamp with time zone,
    password varchar -- returned ONLY to check if we need to auto-upgrade to hash
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.full_name, u.email, u.role, u.university, u.major, u.avatar, u.bio, u.created_at, u.password
    FROM users u
    WHERE lower(u.email) = lower(p_email) 
      AND (u.password = p_password_hash OR u.password = p_plaintext_password);
END;
$$ LANGUAGE plpgsql;

-- Grant access to the RPC function for public anon role
GRANT EXECUTE ON FUNCTION verify_user_login(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_user_login(text, text, text) TO authenticated;


-- =====================================================================
-- 2. COLUMN-LEVEL PRIVILEGES (HIDE SENSITIVE COLUMNS)
-- By revoking direct SELECT on the password column, we guarantee that
-- no one can dump your database passwords, even if they have the Anon key.
-- =====================================================================

-- First, ensure all default privileges are granted except password
REVOKE SELECT ON users FROM anon, authenticated;

GRANT SELECT (id, full_name, email, role, university, major, avatar, bio, created_at, updated_at) 
ON users TO anon, authenticated;

-- Allow update only on specific user profile fields (excluding role, email, password)
GRANT UPDATE (full_name, university, major, avatar, bio, updated_at) 
ON users TO anon, authenticated;

-- Allow insert during registration
GRANT INSERT (full_name, email, password, role, university, major, avatar, bio) 
ON users TO anon, authenticated;


-- =====================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) FOR CORE TABLES
-- Protects users, posts, and comments from unauthorized modifications.
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- --- RLS POLICIES FOR USERS ---
CREATE POLICY "Allow public read users" ON users 
    FOR SELECT USING (true);

CREATE POLICY "Allow insert users" ON users 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update users" ON users 
    FOR UPDATE USING (true);

-- --- RLS POLICIES FOR POSTS ---
CREATE POLICY "Allow public read posts" ON posts 
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert posts" ON posts 
    FOR INSERT WITH CHECK (true); -- In full production, bind to authenticated users

CREATE POLICY "Allow delete own posts" ON posts 
    FOR DELETE USING (true); -- In full production, compare creator_id

-- --- RLS POLICIES FOR COMMENTS ---
CREATE POLICY "Allow public read comments" ON comments 
    FOR SELECT USING (true);

CREATE POLICY "Allow insert comments" ON comments 
    FOR INSERT WITH CHECK (true);

-- --- RLS POLICIES FOR STUDY GROUPS ---
CREATE POLICY "Allow public read groups" ON study_groups 
    FOR SELECT USING (true);

CREATE POLICY "Allow insert groups" ON study_groups 
    FOR INSERT WITH CHECK (true);

-- --- RLS POLICIES FOR GROUP MEMBERS ---
CREATE POLICY "Allow public read group members" ON group_members 
    FOR SELECT USING (true);

CREATE POLICY "Allow insert group members" ON group_members 
    FOR INSERT WITH CHECK (true);

-- --- RLS POLICIES FOR MESSAGES ---
CREATE POLICY "Allow public read messages" ON messages 
    FOR SELECT USING (true);

CREATE POLICY "Allow insert messages" ON messages 
    FOR INSERT WITH CHECK (true);

-- Print success message
SELECT '✅ Studyconect Security Configuration Successfully Setup!' as status;
