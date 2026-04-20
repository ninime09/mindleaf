import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* Refreshes the Supabase session on every request, then enforces auth
   on protected routes:

   - Anonymous → /workspace, /notebook, /read/<anything but the canonical
     demo>: redirect to /sign-in?next=<original path>.
   - Anonymous → /api/summarize (and any other /api/* we may add):
     return 401 JSON. Pages get redirects, APIs get JSON — the right
     thing for fetch() callers.
   - Already-signed-in → /sign-in: redirect away (to ?next= or /workspace)
     so a stray click doesn't dump them on the sign-in form again.

   Public routes (Landing, Pricing, sign-in itself, the canonical demo
   article, /auth/*) stay open. */

const PUBLIC_PATHS = new Set<string>(["/", "/pricing", "/sign-in"]);
const CANONICAL_DETAIL = "/read/designing-calm-software";

function isPublic(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  if (path === CANONICAL_DETAIL) return true;
  if (path.startsWith("/auth/")) return true; /* /auth/callback, /auth/sign-out */
  return false;
}

function isProtectedApi(path: string): boolean {
  /* Future protected APIs go here too. Keep the canonical /api/summarize
     locked down — every call costs Anthropic credits. */
  return path === "/api/summarize";
}

function isProtectedPage(path: string): boolean {
  if (path.startsWith("/workspace")) return true;
  if (path.startsWith("/notebook")) return true;
  /* /read/<id> for non-canonical IDs is private (your own notebook entries).
     The canonical demo at /read/designing-calm-software is public. */
  if (path.startsWith("/read/") && path !== CANONICAL_DETAIL) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  /* Without env vars Supabase is essentially off — let the app run
     anonymously while you finish setup. Auth gate becomes a no-op. */
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

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  /* Already-signed-in users shouldn't see the sign-in form. Bounce
     them through ?next= (defaults to /workspace). */
  if (path === "/sign-in" && user) {
    const next = request.nextUrl.searchParams.get("next") || "/workspace";
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (user || isPublic(path)) return supabaseResponse;

  /* Anonymous + private API → 401 JSON */
  if (isProtectedApi(path)) {
    return NextResponse.json(
      { error: "auth_required" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="mindleaf"' } },
    );
  }

  /* Anonymous + private page → bounce to sign-in carrying ?next= */
  if (isProtectedPage(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path + (request.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
