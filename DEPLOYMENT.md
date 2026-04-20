# Deployment — Vercel + production Supabase

End-to-end checklist for shipping Mindleaf to a public URL. Allow ~30 min
the first time. Follow in order — several steps depend on the URL Vercel
hands you.

---

## 1. Create a separate **production** Supabase project

Don't reuse your dev project. Auth users, RLS rows, and tables should be
isolated so you can break dev without breaking prod.

1. [supabase.com](https://supabase.com) → **New project**
2. Name it `mindleaf-prod`, pick a region close to your users
3. Save the DB password somewhere safe
4. Wait ~30s for provisioning

Then **Settings → API**, copy and stash these for later (you'll paste them
into Vercel in step 5):

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never
  ship to the browser)

## 2. Run the schema on production

Supabase Dashboard → **SQL Editor → New query** → paste the entire
contents of `supabase/schema.sql` from this repo → **Run**.

Verify under **Table Editor** that you see:
`sources, summaries, takeaways, highlights, notes, review_states, usage_quotas`

## 3. Configure email auth (magic link)

**Authentication → Providers → Email**:
- Enable
- Toggle **Confirm email** OFF (we use magic links — Supabase already
  verifies the address by sending a one-time code)

## 4. Push the repo to GitHub (already done)

If you haven't already, make sure `main` is up to date on GitHub. Vercel
will pull from there.

## 5. Connect to Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Import the `mindleaf` GitHub repo
3. **Framework Preset**: Next.js (auto-detected)
4. **Root Directory**: leave blank (project is at repo root)
5. Don't deploy yet — first add env vars (next step)

**Environment Variables** — paste these into Vercel's Project Settings →
Environment Variables. Set scope to "Production" (and "Preview" if you
want PR previews to work too):

```
ANTHROPIC_API_KEY              = sk-ant-...
NEXT_PUBLIC_SUPABASE_URL       = https://xxxxx.supabase.co   (from prod project)
NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...                       (from prod project)
SUPABASE_SERVICE_ROLE_KEY      = eyJ...                       (from prod project)
MINDLEAF_SUMMARIES_PER_MONTH   = 5
```

Click **Deploy**. First build takes ~2 min. You'll get a URL like
`mindleaf-abc123.vercel.app`.

## 6. Wire the Vercel URL back into Supabase

Now that you have the prod URL, tell Supabase + Google about it.

**Supabase Dashboard → Authentication → URL Configuration**:
- **Site URL**: `https://your-vercel-url.vercel.app`
- **Redirect URLs** (add both — magic links + OAuth use them):
  - `https://your-vercel-url.vercel.app/auth/callback`
  - `https://your-vercel-url.vercel.app/auth/callback?next=/workspace`

## 7. Configure Google OAuth (production credentials)

Magic link works without this step. Skip if you don't want Google sign-in
in production.

**Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com))
→ pick (or create) the project you used for dev → **APIs & Services → Credentials**:

1. Edit your OAuth 2.0 Client ID (or create a new one for prod)
2. **Authorized JavaScript origins**: add
   `https://your-vercel-url.vercel.app`
3. **Authorized redirect URIs**: add
   `https://xxxxx.supabase.co/auth/v1/callback` (your prod Supabase URL,
   not Vercel — Supabase brokers the OAuth handshake)

Then **Supabase Dashboard → Authentication → Providers → Google**:
- Enable
- Paste **Client ID** and **Client Secret** from Google Cloud
- Save

## 8. Smoke test the deploy

Hit the Vercel URL and verify:

- [ ] `/` loads (Landing)
- [ ] `/sign-in` → magic link arrives → click it → lands on `/workspace`
- [ ] `/sign-in` → "Continue with Google" → completes → lands on `/workspace`
- [ ] Logged-in: paste a real article URL → summarize works → workspace
      shows the new entry
- [ ] Supabase Table Editor shows new rows in `sources`, `summaries`,
      `takeaways`, `usage_quotas`
- [ ] Logged-out: `/workspace` redirects to `/sign-in?next=/workspace`
- [ ] Logged-out: `/api/summarize` POST returns 401 (try via curl or
      the in-app form)
- [ ] Logged-in: `/read/designing-calm-software` shows the read-only
      banner

## 9. Custom domain (optional)

**Vercel Project → Settings → Domains** → add your domain → follow the
DNS instructions Vercel gives you. Then:

1. Update the Supabase **Site URL** + **Redirect URLs** to your custom
   domain
2. Update the Google Cloud OAuth client to add the custom domain in both
   "Authorized JavaScript origins" and (if applicable) redirect URIs

Vercel issues a free SSL cert automatically once DNS is verified.

---

## Notes for the future

- **Disk cache** (`.cache/summaries/`) doesn't persist on Vercel —
  serverless functions get an ephemeral filesystem per cold start.
  Cache writes are best-effort no-ops; reads always miss. Move to a
  Supabase table or Vercel KV when this becomes a cost problem.
- **Prompt caching** at the Anthropic side still works — the system
  prompt is large enough that Anthropic's prefix cache absorbs most
  repeat reads. That's the cache that actually matters.
- **dev → prod data migration**: there isn't one. Dev Supabase and prod
  Supabase are separate accounts. Your dev rows stay in dev forever.
