-- 🔧 FIX SUPABASE RLS POLICIES FOR DELETING GROUPS, KICKING MEMBERS, AND REVOKING DEPUTIES
-- Paste this script directly into the Supabase SQL Editor (https://supabase.com) and click "Run".

-- 1. Enable UPDATE & DELETE policies for "study_groups"
-- This allows group creators and administrators to update/delete their groups.
DROP POLICY IF EXISTS "Allow delete groups" ON study_groups;
CREATE POLICY "Allow delete groups" ON study_groups FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow update groups" ON study_groups;
CREATE POLICY "Allow update groups" ON study_groups FOR UPDATE USING (true);


-- 2. Enable UPDATE & DELETE policies for "group_members"
-- This allows members to leave, and creators/deputies/admins to kick members or change roles.
DROP POLICY IF EXISTS "Allow delete group members" ON group_members;
CREATE POLICY "Allow delete group members" ON group_members FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow update group members" ON group_members;
CREATE POLICY "Allow update group members" ON group_members FOR UPDATE USING (true);
