import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser client — safe to use in Client Components.
 * Reuses a single instance across the app.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server client — use in Server Components and Route Handlers.
 * Created fresh per call so it never leaks state between requests.
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
