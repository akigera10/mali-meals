import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser client — safe to use in Client Components.
 * Created lazily so a missing env var doesn't crash the module on import
 * when this file is loaded by a server component that only uses createServerClient().
 */
let _browserClient: ReturnType<typeof createClient> | null = null;
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop, receiver) {
    if (!_browserClient) _browserClient = createClient(supabaseUrl, supabaseAnonKey);
    const val = Reflect.get(_browserClient, prop, receiver);
    return typeof val === 'function' ? val.bind(_browserClient) : val;
  },
});

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
