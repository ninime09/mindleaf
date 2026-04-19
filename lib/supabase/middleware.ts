import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* Refreshes the Supabase session on every request and rewrites the
   set-cookie headers so SSR and client stay in sync. Called from the
   root middleware.ts. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  /* If env vars aren't configured yet, fall through silently — the
     app still serves anonymously while the user finishes setup. */
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  /* Touch getUser() so any stale session gets refreshed. We deliberately
     don't gate or redirect here — protected routes (if any) decide
     their own behaviour. F.1 keeps everything accessible anonymously. */
  await supabase.auth.getUser();

  return supabaseResponse;
}
