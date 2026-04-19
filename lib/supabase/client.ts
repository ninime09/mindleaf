import { createBrowserClient } from "@supabase/ssr";

/* Browser-side Supabase client. Safe to call from "use client" code.
   Reads cookies set by the middleware so the session stays in sync
   with the server. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
