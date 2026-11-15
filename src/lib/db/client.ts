import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client — created only when both env vars are set
 * (.env.local: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * Without them the site runs on the bundled sample data, exactly as before.
 * The anon / publishable key is safe in the browser: Row Level Security in
 * supabase/migrations decides what each visitor may read or write.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const hasDb = supabase !== null;
