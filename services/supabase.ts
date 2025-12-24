
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Initialization
 * Project: PingSpace (hlvzzjbjrvhxwadrzceg)
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => true;
