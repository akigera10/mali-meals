import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser client — use in Client Components (auth + data).
 * Uses createBrowserClient from @supabase/ssr so auth tokens are stored
 * in cookies instead of localStorage. This is what lets middleware.ts read
 * and validate the session on every request.
 * Lazy-initialised so importing this module in a server context doesn't crash.
 */
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_t, prop, receiver) {
    if (!_browserClient) _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    const val = Reflect.get(_browserClient, prop, receiver);
    return typeof val === 'function' ? val.bind(_browserClient) : val;
  },
});

/**
 * Server data client — use in Server Components and Route Handlers for
 * database queries. Not session-aware; uses the anon key directly.
 *
 * For middleware session validation, see middleware.ts — it creates its own
 * cookie-aware client using createServerClient from @supabase/ssr directly.
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
