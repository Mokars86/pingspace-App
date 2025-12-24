-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Was users)
-- Extends auth.users, public profile
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  username TEXT,
  avatar TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Available',
  bio TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHATS
CREATE TABLE public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_group BOOLEAN DEFAULT false,
  name TEXT,
  avatar TEXT,
  members UUID[], -- Array of user IDs for simple membership checking as used in api.ts
  last_message TEXT,
  last_message_time TIMESTAMPTZ DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT false,
  disappearing_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Changed to profiles
  text TEXT,
  type TEXT DEFAULT 'text',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT, -- Changed from image
  seller_name TEXT, -- Denormalized for simple display as per api.ts
  description TEXT,
  category TEXT,
  condition TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPACES
CREATE TABLE public.spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT, -- Changed from image
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- received, sent, withdraw, deposit
  amount NUMERIC(15, 2) NOT NULL,
  entity TEXT, -- The name of the other party
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CALLS (Was call_logs)
CREATE TABLE public.calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- The user who owns this log
  participant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- The other person
  type TEXT, -- incoming, outgoing
  media_type TEXT, -- audio, video
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORIES
CREATE TABLE public.stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT,
  user_avatar TEXT,
  image_url TEXT, -- Changed from content/image
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- CHATS
-- api.ts checks `.contains('members', [user.id])`
CREATE POLICY "Users can view chats they are members of" ON public.chats 
  FOR SELECT USING (auth.uid() = ANY(members));
  
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update chats they are members of" ON public.chats 
  FOR UPDATE USING (auth.uid() = ANY(members));

-- MESSAGES
-- Simplified for demo: if you can see the chat, you can see the messages
-- Ideally we check chat membership again, but RLS on chats handles the discovery.
-- For strict security: EXISTS (SELECT 1 FROM chats WHERE id = chat_id AND auth.uid() = ANY(members))
CREATE POLICY "Users can view messages in their chats" ON public.messages 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND auth.uid() = ANY(members))
  );

CREATE POLICY "Users can insert messages in their chats" ON public.messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND auth.uid() = ANY(members))
  );

-- PRODUCTS (Marketplace)
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- SPACES
CREATE POLICY "Spaces are viewable by everyone" ON public.spaces FOR SELECT USING (true);
CREATE POLICY "Users can create spaces" ON public.spaces FOR INSERT WITH CHECK (true);

-- TRANSACTIONS
CREATE POLICY "Users can view their own transactions" ON public.transactions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert transactions" ON public.transactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CALLS
CREATE POLICY "Users can view their own call logs" ON public.calls 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert call logs" ON public.calls 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STORIES
CREATE POLICY "Stories are viewable by everyone" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Users can insert stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
