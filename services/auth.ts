
import { supabase } from "./supabase";
import { User } from "../types";

/**
 * Auth Service
 * Handles Supabase Authentication and Profile Mapping
 */

export const authService = {
  /**
   * Maps a Supabase Auth User + Optional Profile Record to our app's User type.
   * Prioritizes Profile table data, falls back to Auth metadata.
   */
  mapUser: (sbUser: any, profile?: any): User => {
    // metadata is stored in user_metadata during signUp
    const meta = sbUser.user_metadata || {};

    return {
      id: sbUser.id,
      name: profile?.name || meta.name || 'PingSpace User',
      avatar: profile?.avatar || meta.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sbUser.email || 'PS')}&background=ff1744&color=fff`,
      isOnline: true,
      status: profile?.status || 'Available',
      bio: profile?.bio || meta.bio || ''
    };
  },

  /**
   * Ensures a profile exists for the user. If not, creates one using metadata.
   */
  ensureProfile: async (user: any) => {
    try {
      // 1. Try to fetch existing
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (existing) return existing;

      // 2. If missing, create it from metadata (saved during signup)
      const meta = user.user_metadata || {};
      const newProfile = {
        id: user.id,
        name: meta.name || 'PingSpace User',
        username: meta.username || `user_${user.id.slice(0, 6)}`,
        avatar: meta.avatar || `https://ui-avatars.com/api/?name=User&background=ff1744&color=fff`,
        email: user.email,
        phone: meta.phone || '',
        status: 'Available',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('profiles').insert(newProfile);

      if (error) {
        console.error("ensureProfile: Failed to create profile", error);
        return null;
      }

      return newProfile;
    } catch (e) {
      console.error("ensureProfile error", e);
      return null;
    }
  },

  getToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Ensure profile exists (handled automatically if missing)
    const profile = await authService.ensureProfile(user);
    return authService.mapUser(user, profile);
  },

  isAuthenticated: async () => {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Ensure profile exists on any auth state change (login, token refresh)
        const profile = await authService.ensureProfile(session.user);
        callback(authService.mapUser(session.user, profile));
      } else {
        callback(null);
      }
    });

    return () => subscription.unsubscribe();
  },

  logout: async () => {
    await supabase.auth.signOut();
  }
};
