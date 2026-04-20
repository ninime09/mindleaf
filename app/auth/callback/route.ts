import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Handles both magic-link and OAuth callbacks. Supabase redirects here
   either with a `?code=` to exchange for a session, or with
   `?error=&error_code=&error_description=` when the link is expired,
   already used, or otherwise rejected. We surface every failure mode
   back to the sign-in page so the user sees something actionable. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/workspace";

  /* Supabase passed an explicit error — most commonly otp_expired when
     the magic link has timed out (default ~1 hour) or was clicked
     more than once (mail clients sometimes pre-fetch links). */
  const supaError = searchParams.get("error_description") ?? searchParams.get("error");
  if (supaError) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(supaError.replace(/\+/g, " "))}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
}
