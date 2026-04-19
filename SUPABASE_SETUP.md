# Supabase setup — Phase F.1 (auth)

Mindleaf's auth runs on Supabase (magic-link email + Google OAuth). This is the
one-time configuration you need to do in the Supabase dashboard before the
sign-in flow works locally.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Pick any name (e.g. `mindleaf-dev`), pick a region close to you
3. Choose a strong database password — save it somewhere; we don't need it
   for the app, but Supabase asks
4. Wait ~30s while the project provisions

## 2. Grab the keys

In the project dashboard:

- **Settings → API** → copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret —
    server only)

Add them to `.env.local` next to your Anthropic key:

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Then restart the dev server: `npm run dev`.

## 3. Configure the redirect URLs

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs** (Add):
  - `http://localhost:3000/auth/callback`
  - When you deploy, also add `https://your-domain/auth/callback`

This tells Supabase which redirects are allowed after a magic-link click or
OAuth flow.

## 4. Enable Email (magic link)

**Authentication → Providers → Email**:

- Toggle **Enable Email Provider** on
- Toggle **Confirm email** off for development (so you don't need to verify
  every test address)
- Leave the rest at defaults — Supabase ships an OTP/magic-link template

You can test this immediately: sign in at `/sign-in`, paste your email,
click the link in the inbox.

## 5. Enable Google OAuth

This one needs a bit of Google Cloud setup. Skip if you only want magic link
to start.

### 5a. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) →
   create a new project (or pick an existing one)
2. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: `Mindleaf` (or whatever)
   - User support email: your email
   - Developer contact: your email
   - Save & continue through the rest with defaults
   - On the **Test users** page, add your own Google email so you can sign in
     while the app is in test mode
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `Mindleaf (dev)`
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: paste the value Supabase gives you in
     the next step (it'll look like
     `https://xxxxx.supabase.co/auth/v1/callback`)
4. Save → copy the **Client ID** and **Client Secret**

### 5b. Supabase Dashboard

**Authentication → Providers → Google**:

- Toggle **Enable** on
- Paste the **Client ID** and **Client Secret** from step 5a
- Save
- Supabase shows the **Callback URL** here — copy it back into Google's
  Authorized redirect URIs (step 5a-3) if you didn't already

## 6. Verify

Restart `npm run dev`, visit `/sign-in`:

- Magic link: enter your email, click "Send a magic link" → check your inbox
  → click the link → land on `/workspace` as a logged-in user
- Google: click "Continue with Google" → consent screen → land on
  `/workspace`

The avatar in the top-right of any page (Landing, Pricing, etc.) should
show your initial when signed in. Click it for the dropdown with **Sign out**.

## What's next

- **F.2**: tables for `sources`, `summaries`, `takeaways`, `highlights`,
  `notes`, `review_states` with RLS policies that scope every row to the
  signed-in user. Replaces the `lib/api/mock.ts` localStorage backend.
- **F.3**: per-user quotas on `/api/summarize` (loose for paid tiers,
  tighter for anonymous, replacing the current IP-only rate limit).
