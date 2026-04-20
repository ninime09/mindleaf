-- Mindleaf — Phase F.2.1 schema + RLS
-- Run this in Supabase Dashboard → SQL Editor → New query.
-- Idempotent: safe to re-run; uses CREATE TABLE IF NOT EXISTS and DROP POLICY IF EXISTS.

-- ============================================================
-- 1. sources — one row per article/podcast/video the user adds
-- ============================================================
create table if not exists public.sources (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  author            text not null default '',
  type              text not null check (type in ('blog','podcast','video')),
  url               text not null,
  duration_sec      int,
  added_at          timestamptz not null default now(),
  collection_id     text,
  tags              text[] not null default '{}',
  hue               int not null default 0,
  takeaway          text,
  notes_count       int not null default 0,
  highlights_count  int not null default 0,
  bookmarked        boolean not null default false,
  archived          boolean not null default false,
  archived_at       timestamptz
);

create index if not exists sources_user_added_idx
  on public.sources (user_id, added_at desc);

-- ============================================================
-- 2. summaries — 1:1 with sources
-- ============================================================
create table if not exists public.summaries (
  source_id             text primary key references public.sources(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  thesis                text not null,
  paragraphs            text[] not null default '{}',
  memorable_quote       text,
  beginner_explanation  text[],
  lang                  text check (lang in ('en','zh'))
);

-- ============================================================
-- 3. takeaways — N:1 with sources, ordered
-- ============================================================
create table if not exists public.takeaways (
  id          text primary key,
  source_id   text not null references public.sources(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  position    int not null default 0,
  title       text not null,
  detail      text not null
);

create index if not exists takeaways_source_idx
  on public.takeaways (source_id, position);

-- ============================================================
-- 4. highlights — N:1 with sources
-- ============================================================
create table if not exists public.highlights (
  id          text primary key,
  source_id   text not null references public.sources(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  hue         int not null default 0,
  timestamp   text,
  annotation  text,
  block_id    text,
  created_at  timestamptz not null default now()
);

create index if not exists highlights_source_idx
  on public.highlights (source_id, created_at);

-- ============================================================
-- 5. notes — 1:1 with sources
-- ============================================================
create table if not exists public.notes (
  source_id   text primary key references public.sources(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null default '',
  tags        text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 6. review_states — 1:1 with sources (SM-2)
-- ============================================================
create table if not exists public.review_states (
  source_id         text primary key references public.sources(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  ease              real not null default 2.5,
  interval_days     int  not null default 0,
  due_at            timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  review_count      int not null default 0
);

create index if not exists review_due_idx
  on public.review_states (user_id, due_at);

-- ============================================================
-- 7. Row-Level Security — every table is per-user
-- ============================================================
alter table public.sources       enable row level security;
alter table public.summaries     enable row level security;
alter table public.takeaways     enable row level security;
alter table public.highlights    enable row level security;
alter table public.notes         enable row level security;
alter table public.review_states enable row level security;

-- sources
drop policy if exists "sources_owner_select" on public.sources;
drop policy if exists "sources_owner_insert" on public.sources;
drop policy if exists "sources_owner_update" on public.sources;
drop policy if exists "sources_owner_delete" on public.sources;
create policy "sources_owner_select" on public.sources for select using (auth.uid() = user_id);
create policy "sources_owner_insert" on public.sources for insert with check (auth.uid() = user_id);
create policy "sources_owner_update" on public.sources for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sources_owner_delete" on public.sources for delete using (auth.uid() = user_id);

-- summaries
drop policy if exists "summaries_owner_select" on public.summaries;
drop policy if exists "summaries_owner_insert" on public.summaries;
drop policy if exists "summaries_owner_update" on public.summaries;
drop policy if exists "summaries_owner_delete" on public.summaries;
create policy "summaries_owner_select" on public.summaries for select using (auth.uid() = user_id);
create policy "summaries_owner_insert" on public.summaries for insert with check (auth.uid() = user_id);
create policy "summaries_owner_update" on public.summaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "summaries_owner_delete" on public.summaries for delete using (auth.uid() = user_id);

-- takeaways
drop policy if exists "takeaways_owner_select" on public.takeaways;
drop policy if exists "takeaways_owner_insert" on public.takeaways;
drop policy if exists "takeaways_owner_update" on public.takeaways;
drop policy if exists "takeaways_owner_delete" on public.takeaways;
create policy "takeaways_owner_select" on public.takeaways for select using (auth.uid() = user_id);
create policy "takeaways_owner_insert" on public.takeaways for insert with check (auth.uid() = user_id);
create policy "takeaways_owner_update" on public.takeaways for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "takeaways_owner_delete" on public.takeaways for delete using (auth.uid() = user_id);

-- highlights
drop policy if exists "highlights_owner_select" on public.highlights;
drop policy if exists "highlights_owner_insert" on public.highlights;
drop policy if exists "highlights_owner_update" on public.highlights;
drop policy if exists "highlights_owner_delete" on public.highlights;
create policy "highlights_owner_select" on public.highlights for select using (auth.uid() = user_id);
create policy "highlights_owner_insert" on public.highlights for insert with check (auth.uid() = user_id);
create policy "highlights_owner_update" on public.highlights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "highlights_owner_delete" on public.highlights for delete using (auth.uid() = user_id);

-- notes
drop policy if exists "notes_owner_select" on public.notes;
drop policy if exists "notes_owner_insert" on public.notes;
drop policy if exists "notes_owner_update" on public.notes;
drop policy if exists "notes_owner_delete" on public.notes;
create policy "notes_owner_select" on public.notes for select using (auth.uid() = user_id);
create policy "notes_owner_insert" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_owner_update" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_owner_delete" on public.notes for delete using (auth.uid() = user_id);

-- review_states
drop policy if exists "review_owner_select" on public.review_states;
drop policy if exists "review_owner_insert" on public.review_states;
drop policy if exists "review_owner_update" on public.review_states;
drop policy if exists "review_owner_delete" on public.review_states;
create policy "review_owner_select" on public.review_states for select using (auth.uid() = user_id);
create policy "review_owner_insert" on public.review_states for insert with check (auth.uid() = user_id);
create policy "review_owner_update" on public.review_states for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "review_owner_delete" on public.review_states for delete using (auth.uid() = user_id);
