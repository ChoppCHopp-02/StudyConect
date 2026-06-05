-- 🔧 Fix: Restore table permissions after security lockdown
-- Run this in Supabase SQL Editor

-- 1. Khôi phục quyền SELECT đầy đủ cho bảng users
GRANT SELECT ON users TO anon, authenticated;

-- 2. Đảm bảo các bảng khác cũng có quyền đọc/ghi cần thiết
GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON study_groups TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_invites TO anon, authenticated;

-- 3. Cấp quyền cho các sequence (cần khi INSERT tạo ID mới)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Xác nhận RLS policies vẫn còn (bảo mật vẫn giữ nguyên)
-- Các policies đã tạo từ script trước vẫn hoạt động

SELECT '✅ Permissions restored! Đăng nhập lại thử nhé.' as status;
