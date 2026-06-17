-- Moderation flags for posts and files (admin approval workflow)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;

-- Existing content stays visible; only new uploads require approval
UPDATE posts SET approved = TRUE WHERE approved IS DISTINCT FROM TRUE;
UPDATE files SET approved = TRUE WHERE approved IS DISTINCT FROM TRUE;
