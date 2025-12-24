
import { supabase } from "./supabase";
import { User, ChatSession, Transaction, Product, Space, Message, Story, CallLog } from '../types';
import { authService } from './auth';

const formatError = (error: any, prefix: string): string => {
  if (!error) return `${prefix}: Unknown error`;
  const message = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));

  if (message.toLowerCase().includes('email not confirmed')) {
    return "Verification Required: Please check your email inbox.";
  }

  if (message.includes('column') && message.includes('does not exist')) {
    return `Database Schema Error: Required column missing.`;
  }

  if (message.toLowerCase().includes('already registered')) {
    return "This email is already in use. Try logging in instead.";
  }

  if (message.includes('profiles') && message.includes('policy')) {
    return "Permission Denied: Your profile couldn't be saved. This usually happens if email verification is required.";
  }

  return `${prefix}: ${message}`;
};

export const api = {
  system: {
    diagnose: async () => {
      const results = {
        connection: false,
        auth: false,
        tables: { profiles: false, chats: false, messages: false, stories: false, products: false, spaces: false, transactions: false, calls: false },
        error: null as string | null
      };

      try {
        const { data: { session }, error: authErr } = await supabase.auth.getSession();
        results.connection = true;
        results.auth = !authErr;

        const checkTable = async (name: string) => {
          try {
            const { error } = await supabase.from(name).select('*', { count: 'exact', head: true }).limit(1);
            return !error || !error.message.includes('does not exist');
          } catch {
            return false;
          }
        };

        results.tables.profiles = await checkTable('profiles');
        results.tables.chats = await checkTable('chats');
        results.tables.messages = await checkTable('messages');
        results.tables.stories = await checkTable('stories');
        results.tables.products = await checkTable('products');
        results.tables.spaces = await checkTable('spaces');
        results.tables.transactions = await checkTable('transactions');
        results.tables.calls = await checkTable('calls');

      } catch (e: any) {
        results.error = e.message;
      }

      return results;
    }
  },
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(formatError(error, "Login failed"));

      // Use ensureProfile to guarantee the user record exists in our table
      const profile = await authService.ensureProfile(data.user);

      return authService.mapUser(data.user, profile);
    },
    signup: async (form: any): Promise<User & { needsVerification?: boolean }> => {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=ff1744&color=fff`;

      // 1. Attempt Auth Signup
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            username: form.username,
            phone: form.phone,
            avatar: avatarUrl
          }
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          try {
            return await api.auth.login(form.email, form.password);
          } catch (loginErr) {
            throw new Error("Email already registered. Please sign in.");
          }
        }
        throw new Error(formatError(error, "Signup failed"));
      }

      if (!data.user) throw new Error("Account creation failed: No user returned.");

      // IMPORTANT: If session is null, it means email confirmation is ON.
      // We cannot write to the profiles table yet because the RLS policy (auth.uid() = id) will fail.
      if (!data.session) {
        return {
          ...authService.mapUser(data.user, {
            id: data.user.id,
            name: form.name,
            avatar: avatarUrl,
            status: 'Pending Verification'
          }),
          needsVerification: true
        };
      }

      // 2. Create Profile Record (only if already verified/logged in)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: form.name,
        username: form.username,
        avatar: avatarUrl,
        email: form.email,
        phone: form.phone,
        status: 'Available',
        updated_at: new Date().toISOString()
      });

      if (profileError) {
        console.error("Profile creation failed", profileError);
        // We still return the user because they ARE created in Auth.
      }

      return authService.mapUser(data.user, {
        id: data.user.id,
        name: form.name,
        avatar: avatarUrl,
        status: 'Available'
      });
    },
    checkUsernameAvailability: async (username: string): Promise<boolean> => {
      if (!username || username.length < 3) return false;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') return true;
        return !data;
      } catch (e) {
        return true;
      }
    },
    resendConfirmationEmail: async (email: string): Promise<void> => {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw new Error(formatError(error, "Resend failed"));
    },
    socialLogin: async (provider: string): Promise<void> => {
      const { error } = await supabase.auth.signInWithOAuth({ provider: provider.toLowerCase() as any });
      if (error) throw new Error(formatError(error, "Social login failed"));
    },
    resetPassword: async (email: string): Promise<void> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(formatError(error, "Reset failed"));
    },
    me: async (): Promise<User> => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      return user;
    },
    updateProfile: async (updates: Partial<User>): Promise<User> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session");

      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.avatar !== undefined) payload.avatar = updates.avatar;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.bio !== undefined) payload.bio = updates.bio;

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(formatError(error, "Profile update failed"));
      const d = data as any;
      return { id: d.id, name: d.name, avatar: d.avatar, status: d.status, bio: d.bio, isOnline: true };
    },
    logout: async () => { await authService.logout(); }
  },
  contacts: {
    list: async (): Promise<User[]> => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').limit(50);
        if (error) throw error;
        return ((data || []) as any[]).map(d => ({ id: d.id, name: d.name, avatar: d.avatar, status: d.status, bio: d.bio, isOnline: false }));
      } catch (e) { return []; }
    }
  },
  chats: {
    list: async (): Promise<ChatSession[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data: chatsData, error } = await supabase.from('chats').select(`*, messages(*)`).contains('members', [user.id]).order('last_message_time', { ascending: false });
        if (error) throw error;
        const chats = (chatsData || []) as any[];
        const otherUserIds = new Set<string>();
        chats.forEach(c => { if (!c.is_group) { const otherId = c.members.find((m: string) => m !== user.id); if (otherId) otherUserIds.add(otherId); } });
        const { data: profilesData } = await supabase.from('profiles').select('id, name, avatar, status, bio').in('id', Array.from(otherUserIds));
        const profiles = (profilesData || []) as any[];
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        return chats.map(d => {
          let participant: User;
          if (d.is_group) { participant = { id: d.id, name: d.name, avatar: d.avatar }; }
          else {
            const otherId = d.members.find((m: string) => m !== user.id);
            const p = profileMap.get(otherId) as any;
            participant = { id: otherId || 'unknown', name: p?.name || 'User', avatar: p?.avatar || `https://ui-avatars.com/api/?name=U`, status: p?.status, bio: p?.bio };
          }
          return {
            id: d.id, participant, lastMessage: d.last_message || '', lastTime: d.last_message_time ? new Date(d.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            unread: 0, messages: (d.messages || []).map((m: any) => ({ id: m.id, senderId: m.sender_id, text: m.text, type: m.type, timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), createdAt: new Date(m.created_at).getTime() })),
            isGroup: d.is_group, isPinned: d.is_pinned, disappearingMode: d.disappearing_mode
          };
        });
      } catch (e) { return []; }
    },
    createGroup: async (name: string, memberIds: string[]): Promise<ChatSession> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      const members = Array.from(new Set([...memberIds, user.id]));
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff1744&color=fff`;
      const { data, error } = await supabase.from('chats').insert({ name, avatar, is_group: true, members, last_message: 'Group created' }).select().single();
      if (error) throw new Error(formatError(error, "Failed to create group"));
      const d = data as any;
      return { id: d.id, participant: { id: d.id, name: d.name, avatar: d.avatar }, lastMessage: d.last_message, lastTime: 'Just now', unread: 0, messages: [], isGroup: true };
    },
    createChat: async (contactId: string): Promise<ChatSession> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      const { data: existing } = await supabase.from('chats').select('*').eq('is_group', false).contains('members', [user.id, contactId]).maybeSingle();
      if (existing) {
        const { data: contact } = await supabase.from('profiles').select('*').eq('id', contactId).maybeSingle();
        const c = contact as any;
        const e = existing as any;
        return { id: e.id, participant: { id: contactId, name: c?.name || 'User', avatar: c?.avatar || '' }, lastMessage: e.last_message, lastTime: 'Now', unread: 0, messages: [], isGroup: false };
      }
      const members = [user.id, contactId];
      const { data: contact } = await supabase.from('profiles').select('*').eq('id', contactId).maybeSingle();
      const { data, error } = await supabase.from('chats').insert({ is_group: false, members, last_message: 'Started conversation' }).select().single();
      if (error) throw new Error(formatError(error, "Failed to start chat"));
      const d = data as any;
      const c = contact as any;
      return { id: d.id, participant: { id: contactId, name: c?.name || 'User', avatar: c?.avatar || `https://ui-avatars.com/api/?name=User` }, lastMessage: d.last_message, lastTime: 'Just now', unread: 0, messages: [], isGroup: false };
    },
    sendMessage: async (sessionId: string, text: string, type: Message['type'], metadata?: any): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      const { error } = await supabase.from('messages').insert({ chat_id: sessionId, sender_id: user.id, text, type, metadata });
      if (error) throw new Error(formatError(error, "Message failed"));
      await supabase.from('chats').update({ last_message: text || type, last_message_time: new Date().toISOString() }).eq('id', sessionId);
    },
    togglePin: async (chatId: string, isPinned: boolean): Promise<void> => {
      const { error } = await supabase.from('chats').update({ is_pinned: isPinned }).eq('id', chatId);
      if (error) throw new Error(formatError(error, "Failed to update pin state"));
    }
  },
  wallet: {
    getTransactions: async (): Promise<Transaction[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) throw error;
        return ((data || []) as any[]).map(d => ({ id: d.id, type: d.type, amount: d.amount, date: new Date(d.created_at).toLocaleDateString(), entity: d.entity }));
      } catch (e) { return []; }
    },
    getBalance: async (): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
      return (data as any)?.wallet_balance || 0;
    },
    pay: async (amount: number, description: string): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // 1. Get current balance
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
      const currentBalance = (profile as any)?.wallet_balance || 0;

      if (currentBalance < amount) {
        throw new Error("Insufficient funds");
      }

      // 2. Deduct balance
      const newBalance = currentBalance - amount;
      const { error: updateError } = await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
      if (updateError) throw new Error(formatError(updateError, "Payment failed"));

      // 3. Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'sent',
        amount: amount,
        entity: description
      });

      return newBalance;
    },
    transfer: async (recipient: string, amount: number): Promise<void> => {
      // Re-use pay logic or similar
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      await api.wallet.pay(amount, `Transfer to ${recipient}`);
    },
    deposit: async (amount: number, method: string): Promise<Transaction> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // Update balance
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
      const current = (profile as any)?.wallet_balance || 0;
      await supabase.from('profiles').update({ wallet_balance: current + amount }).eq('id', user.id);

      const { data, error } = await supabase.from('transactions').insert({ user_id: user.id, type: 'deposit', amount, entity: method }).select().single();
      if (error) throw new Error(formatError(error, "Deposit failed"));
      const d = data as any;
      return { id: d.id, type: d.type, amount: d.amount, date: 'Just now', entity: d.entity };
    }
  },
  calls: {
    list: async (): Promise<CallLog[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase
          .from('calls')
          .select('*, profiles!calls_participant_id_fkey(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return ((data || []) as any[]).map(d => ({
          id: d.id,
          participant: {
            id: d.profiles?.id || 'unknown',
            name: d.profiles?.name || 'Unknown User',
            avatar: d.profiles?.avatar || `https://ui-avatars.com/api/?name=U`,
          },
          type: d.type,
          mediaType: d.media_type,
          duration: d.duration,
          timestamp: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
          createdAt: new Date(d.created_at).getTime()
        }));
      } catch (e) { return []; }
    },
    save: async (log: Omit<CallLog, 'id' | 'timestamp' | 'createdAt'>): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase.from('calls').insert({
        user_id: user.id,
        participant_id: log.participant.id,
        type: log.type,
        media_type: log.mediaType,
        duration: log.duration
      });

      if (error) throw new Error(formatError(error, "Failed to log neural transmission"));
    }
  },
  stories: {
    list: async (): Promise<Story[]> => {
      try {
        const { data, error } = await supabase.from('stories').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return ((data || []) as any[]).map(d => ({
          id: d.id,
          userId: d.user_id,
          userName: d.user_name,
          userAvatar: d.user_avatar,
          type: d.story_type || 'image',
          content: d.story_type === 'text' ? d.text_content : d.image_url,
          timestamp: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          viewed: false,
          caption: d.caption,
          background: d.background
        }));
      } catch (e) { return []; }
    },
    addStory: async (storyData: { type: 'image' | 'text'; content: string; caption?: string; background?: string }): Promise<Story> => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const insertData: any = {
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar,
        story_type: storyData.type,
        caption: storyData.caption || null
      };

      if (storyData.type === 'image') {
        insertData.image_url = storyData.content;
      } else {
        insertData.text_content = storyData.content;
        insertData.background = storyData.background || 'bg-gradient-to-br from-[#ff1744] to-purple-600';
      }

      const { data, error } = await supabase.from('stories').insert(insertData).select().single();
      if (error) throw new Error(formatError(error, "Failed to share story"));

      const d = data as any;
      return {
        id: d.id,
        userId: d.user_id,
        userName: d.user_name,
        userAvatar: d.user_avatar,
        type: d.story_type,
        content: d.story_type === 'text' ? d.text_content : d.image_url,
        timestamp: 'Just now',
        viewed: false,
        caption: d.caption,
        background: d.background
      };
    }
  },
  spaces: {
    list: async (): Promise<Space[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase.from('spaces').select('*, space_members(user_id)');
        if (error) throw error;

        return ((data || []) as any[]).map(d => ({
          id: d.id,
          name: d.name,
          members: d.member_count,
          image: d.image_url,
          description: d.description,
          joined: d.space_members?.some((m: any) => m.user_id === user.id) || false
        }));
      } catch (e) { return []; }
    },
    create: async (formData: { name: string; description: string; image: string }): Promise<Space> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data, error } = await supabase.from('spaces').insert({ name: formData.name, description: formData.description, image_url: formData.image, member_count: 1 }).select().single();
      if (error) throw new Error(formatError(error, "Failed to create space"));

      // Auto-join creator
      await supabase.from('space_members').insert({ space_id: data.id, user_id: user.id });

      const d = data as any;
      return { id: d.id, name: d.name, members: d.member_count, image: d.image_url, description: d.description, joined: true };
    },
    join: async (id: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase.from('space_members').insert({ space_id: id, user_id: user.id });
      if (error) throw new Error(formatError(error, "Failed to join space"));
    },
    leave: async (id: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase.from('space_members').delete().eq('space_id', id).eq('user_id', user.id);
      if (error) throw new Error(formatError(error, "Failed to leave space"));
    }
  },
  market: {
    getProducts: async (): Promise<Product[]> => {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        return ((data || []) as any[]).map(d => ({ id: d.id, title: d.title, price: d.price, image: d.image_url, seller: d.seller_name, rating: 4.5, description: d.description, category: d.category, condition: d.condition, location: d.location }));
      } catch (e) { return []; }
    },
    create: async (item: { title: string; price: number; image: string; description: string; category?: string; condition?: string; location?: string }): Promise<Product> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data, error } = await supabase.from('products').insert({
        title: item.title,
        price: item.price,
        image_url: item.image,
        description: item.description,
        seller_name: user.user_metadata?.name || 'User', // Simple denormalization
        category: item.category || 'General',
        condition: item.condition || 'New',
        location: item.location || 'Metaverse'
      }).select().single();

      if (error) throw new Error(formatError(error, "Failed to list item"));

      const d = data as any;
      return { id: d.id, title: d.title, price: d.price, image: d.image_url, seller: d.seller_name, rating: 5.0, description: d.description, category: d.category, condition: d.condition, location: d.location };
    }
  }
};
