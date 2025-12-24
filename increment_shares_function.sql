-- Additional SQL function for incrementing post shares count
-- Run this in Supabase SQL Editor after the main migration

CREATE OR REPLACE FUNCTION increment_post_shares(post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts
  SET shares_count = shares_count + 1
  WHERE id = post_id;
END;
$$;
