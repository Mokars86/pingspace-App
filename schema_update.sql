
-- Create a join table for Spaces and Users
CREATE TABLE IF NOT EXISTS public.space_members (
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (space_id, user_id)
);

-- Enable RLS
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

-- Policies for space_members
CREATE POLICY "Users can view members of spaces" ON public.space_members FOR SELECT USING (true);
CREATE POLICY "Users can join spaces" ON public.space_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave spaces" ON public.space_members FOR DELETE USING (auth.uid() = user_id);

-- Add a trigger to update member_count in spaces table (Optional but good for performance)
CREATE OR REPLACE FUNCTION update_space_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.spaces SET member_count = member_count + 1 WHERE id = NEW.space_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.spaces SET member_count = member_count - 1 WHERE id = OLD.space_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_count_after_join
AFTER INSERT OR DELETE ON public.space_members
FOR EACH ROW EXECUTE FUNCTION update_space_member_count();
