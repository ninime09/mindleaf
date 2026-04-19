import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* Server-side Supabase client. Use from server components, route
   handlers, and server actions. Cookie writes are gated through Next's
   cookies() so server-rendered output stays in sync with the session. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* cookies().set() can throw in pure RSC contexts —
               middleware will refresh the session on next request. */
          }
        },
      },
    },
  );
}
