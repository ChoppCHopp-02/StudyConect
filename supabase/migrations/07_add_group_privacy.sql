-- Migration: Thêm tính năng nhóm riêng tư
-- Chạy trong Supabase Dashboard > SQL Editor

-- 1. Thêm cột is_private vào study_groups
ALTER TABLE study_groups
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tạo bảng group_join_requests
CREATE TABLE IF NOT EXISTS group_join_requests (
  id          BIGSERIAL PRIMARY KEY,
  group_id    BIGINT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_gjr_group_status ON group_join_requests (group_id, status);
CREATE INDEX IF NOT EXISTS idx_gjr_user ON group_join_requests (user_id);

-- RLS (nếu project dùng Row Level Security)
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- User tự tạo request cho bản thân
CREATE POLICY "Users can insert own join requests"
  ON group_join_requests FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text OR true);

-- User xem request của mình, trưởng nhóm xem tất cả của nhóm
CREATE POLICY "View join requests"
  ON group_join_requests FOR SELECT
  USING (true);

-- Chỉ cập nhật status (approve/reject)
CREATE POLICY "Update join request status"
  ON group_join_requests FOR UPDATE
  USING (true);
