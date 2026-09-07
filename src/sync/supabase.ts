import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/**
 * The app is fully usable without a backend, so a missing key is not a crash —
 * sync simply stays off and everything runs from local SQLite.
 */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No deep-link callback: the only sign-in we ever do is anonymous.
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * There is no login screen anywhere in this app. The first launch creates an
 * anonymous Supabase user; that user id is what RLS scopes every row to, and
 * the session is refreshed silently from then on.
 *
 * Requires "Allow anonymous sign-ins" to be enabled for the project.
 */
export async function ensureAnonymousUser(): Promise<string | null> {
  if (!supabase) return null;

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) return existing.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[sync] anonymous sign-in failed:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}
