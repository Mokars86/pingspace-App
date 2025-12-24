-- Discovery & Spaces Feature Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- POSTS & SOCIAL FEATURES
-- ============================================

-- Posts table for public/social posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(20) DEFAULT 'none', -- 'image', 'video', 'none'
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'friends', 'private'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);

-- Follows (user following system)
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- ============================================
-- SPACES ENHANCEMENTS
-- ============================================

-- Space posts (discussion feed)
CREATE TABLE IF NOT EXISTS space_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20) DEFAULT 'none',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_space_posts_space_id ON space_posts(space_id);
CREATE INDEX IF NOT EXISTS idx_space_posts_user_id ON space_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_space_posts_created_at ON space_posts(created_at DESC);

-- Space events
CREATE TABLE IF NOT EXISTS space_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  location TEXT,
  attendees_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_space_events_space_id ON space_events(space_id);
CREATE INDEX IF NOT EXISTS idx_space_events_date ON space_events(event_date);

-- Space event attendees
CREATE TABLE IF NOT EXISTS space_event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES space_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON space_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON space_event_attendees(user_id);

-- Space files
CREATE TABLE IF NOT EXISTS space_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_space_files_space_id ON space_files(space_id);

-- Space post likes
CREATE TABLE IF NOT EXISTS space_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES space_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_post_likes_post_id ON space_post_likes(post_id);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Update spaces table
ALTER TABLE spaces
ADD COLUMN IF NOT EXISTS banner_image TEXT,
ADD COLUMN IF NOT EXISTS description_long TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS events_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS files_count INTEGER DEFAULT 0;

-- Update profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Update space_members table to include role
ALTER TABLE space_members
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member', -- 'admin', 'moderator', 'member'
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Function to update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comments_count
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Function to update followers/following count
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update space post likes count
CREATE OR REPLACE FUNCTION update_space_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE space_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE space_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_space_post_likes_count
AFTER INSERT OR DELETE ON space_post_likes
FOR EACH ROW EXECUTE FUNCTION update_space_post_likes_count();

-- Function to update event attendees count
CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE space_events SET attendees_count = attendees_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE space_events SET attendees_count = attendees_count - 1 WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_attendees_count
AFTER INSERT OR DELETE ON space_event_attendees
FOR EACH ROW EXECUTE FUNCTION update_event_attendees_count();

-- Function to update space counts
CREATE OR REPLACE FUNCTION update_space_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'space_posts' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE spaces SET posts_count = posts_count + 1 WHERE id = NEW.space_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE spaces SET posts_count = posts_count - 1 WHERE id = OLD.space_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'space_events' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE spaces SET events_count = events_count + 1 WHERE id = NEW.space_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE spaces SET events_count = events_count - 1 WHERE id = OLD.space_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'space_files' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE spaces SET files_count = files_count + 1 WHERE id = NEW.space_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE spaces SET files_count = files_count - 1 WHERE id = OLD.space_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_space_posts_count
AFTER INSERT OR DELETE ON space_posts
FOR EACH ROW EXECUTE FUNCTION update_space_counts();

CREATE TRIGGER trigger_update_space_events_count
AFTER INSERT OR DELETE ON space_events
FOR EACH ROW EXECUTE FUNCTION update_space_counts();

CREATE TRIGGER trigger_update_space_files_count
AFTER INSERT OR DELETE ON space_files
FOR EACH ROW EXECUTE FUNCTION update_space_counts();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_post_likes ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Public posts are viewable by everyone" ON posts
  FOR SELECT USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Post likes policies
CREATE POLICY "Anyone can view post likes" ON post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Anyone can view comments" ON post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments" ON post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Space posts policies
CREATE POLICY "Space members can view posts" ON space_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_id = space_posts.space_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can create posts" ON space_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_id = space_posts.space_id 
      AND user_id = auth.uid()
    )
  );

-- Space events policies
CREATE POLICY "Space members can view events" ON space_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_id = space_events.space_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can create events" ON space_events
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_id = space_events.space_id 
      AND user_id = auth.uid()
    )
  );

-- Space files policies
CREATE POLICY "Space members can view files" ON space_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_id = space_files.space_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Space members can upload files" ON space_files
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM space_members 
      WHERE space_id = space_files.space_id 
      AND user_id = auth.uid()
    )
  );

-- Event attendees policies
CREATE POLICY "Anyone can view attendees" ON space_event_attendees
  FOR SELECT USING (true);

CREATE POLICY "Users can attend events" ON space_event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events" ON space_event_attendees
  FOR DELETE USING (auth.uid() = user_id);

-- Space post likes policies
CREATE POLICY "Space members can view likes" ON space_post_likes
  FOR SELECT USING (true);

CREATE POLICY "Space members can like posts" ON space_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON space_post_likes
  FOR DELETE USING (auth.uid() = user_id);
