
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Add is_public to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Add privacy columns to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_online boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_last_seen boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS allow_follows boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS allow_anonymous boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS allow_replies boolean NOT NULL DEFAULT true;

-- Follows table
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own follows" ON public.follows FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Authenticated can follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can update follow status" ON public.follows FOR UPDATE USING (auth.uid() = following_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Chats table
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own chats" ON public.chats FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Authenticated can create chats" ON public.chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  reply_to_id uuid REFERENCES public.chat_messages(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can see messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_messages.chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);
CREATE POLICY "Chat participants can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chats WHERE id = chat_messages.chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);
CREATE POLICY "Chat participants can update message status" ON public.chat_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_messages.chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);

-- Chat reactions
CREATE TABLE public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can see reactions" ON public.chat_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_messages cm JOIN public.chats c ON c.id = cm.chat_id WHERE cm.id = chat_reactions.message_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
);
CREATE POLICY "Authenticated can add reactions" ON public.chat_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.chat_reactions FOR DELETE USING (auth.uid() = user_id);

-- Message replies (anonymous)
CREATE TABLE public.message_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  replier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receiver can reply to their messages" ON public.message_replies FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = replier_id AND EXISTS (SELECT 1 FROM public.messages WHERE id = message_replies.message_id AND receiver_id = auth.uid())
);
CREATE POLICY "Sender can see replies" ON public.message_replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.messages WHERE id = message_replies.message_id AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
);

-- Blocked users
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Authenticated can block" ON public.blocked_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- Profile visits
CREATE TABLE public.profile_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record visits" ON public.profile_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Profile owners can see visits" ON public.profile_visits FOR SELECT USING (auth.uid() = profile_id);

-- Notify on reply
CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  original_sender_id uuid;
BEGIN
  SELECT sender_id INTO original_sender_id FROM public.messages WHERE id = NEW.message_id;
  IF original_sender_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (original_sender_id, 'حد رد على رسالتك! 💬', 'reply');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_reply
  AFTER INSERT ON public.message_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reply();

-- Notify on follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, content, type)
  VALUES (NEW.following_id, 'حد عايز يتابعك! 👀', 'follow');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Enable realtime for chat_messages and chats
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
