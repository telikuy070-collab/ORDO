import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAnonKey, getSupabaseUrl } from './env';

// This module is browser-facing. It must only ever create clients with the
// anon key: the service-role key bypasses RLS and must never reach a bundle.
// Privileged operations belong in a server or Edge Function context.

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey());
  }

  return supabaseClient;
}

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}
