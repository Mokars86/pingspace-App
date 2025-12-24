
import { supabase } from "./supabase";

/**
 * Enhanced Real-time Service (Supabase Channels & Presence)
 */

type Listener = (data: any) => void;

class RealtimeService {
  private listeners: Record<string, Listener[]> = {};
  private channel: any = null;
  public connected: boolean = false;

  async connect(token?: string) {
    if (this.connected) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Main Channel for Database Changes & Presence
    this.channel = supabase.channel('pingspace-main', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // 1. Database Listeners (Messages)
    this.channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        table: 'messages', 
        schema: 'public' 
      }, (payload) => {
        this.emit('new_message', {
          id: payload.new.id,
          senderId: payload.new.sender_id,
          text: payload.new.text,
          chatId: payload.new.chat_id,
          type: payload.new.type,
          createdAt: new Date(payload.new.created_at).getTime()
        });
      });

    // 2. Presence Listeners (Online Status)
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const newState = this.channel.presenceState();
        this.emit('presence_change', newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      });

    // 3. Custom Broadcasts (Typing & Buzz)
    this.channel.on('broadcast', { event: 'typing' }, (payload) => {
      this.emit('typing_status', payload.payload);
    });

    this.channel.on('broadcast', { event: 'buzz' }, (payload) => {
      this.emit('incoming_buzz', payload.payload);
    });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.connected = true;
        // Track current user presence
        await this.channel.track({
          online_at: new Date().toISOString(),
          user_id: user.id
        });
      }
    });
  }

  broadcastTyping(chatId: string, userId: string, isTyping: boolean) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { chatId, isTyping, userId }
      });
    }
  }

  broadcastBuzz(chatId: string, userId: string) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'buzz',
        payload: { chatId, userId }
      });
    }
  }

  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.connected = false;
  }

  on(event: string, callback: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, payload: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(payload));
    }
  }
}

export const socketService = new RealtimeService();
