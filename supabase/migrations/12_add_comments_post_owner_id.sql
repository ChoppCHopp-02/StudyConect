-- Add post_owner_id column to comments table
-- Used by GlobalMessageListener to filter Realtime subscriptions
-- so users get notified when someone comments on their post

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS post_owner_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL;
