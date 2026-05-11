import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Intentionally not passing the Database generic here — hand-written types are
// applied at the call site via explicit .returns<T>() or type assertions.
// Replace with generated types (npx supabase gen types typescript) after DB is live.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});
