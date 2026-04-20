/* Real data layer — mirrors mock.ts's public surface, but persists to
   Supabase Postgres. RLS policies (see supabase/schema.sql) scope every
   read/write to auth.uid() so the client never needs to filter by user. */

import { createClient } from "@/lib/supabase/client";
import type {
  Collection, Highlight, Note, Rating, ReviewCard, ReviewItem, ReviewState,
  Source, SummarizeResponse, Summary, Takeaway,
} from "./types";

/* ============================================================
   Row shapes — snake_case as stored in Postgres.
   ============================================================ */

type SourceRow = {
  id: string;
  user_id: string;
  title: string;
  author: string;
  type: "blog" | "podcast" | "video";
  url: string;
  duration_sec: number | null;
  added_at: string;
  collection_id: string | null;
  tags: string[];
  hue: number;
  takeaway: string | null;
  notes_count: number;
  highlights_count: number;
  bookmarked: boolean;
  archived: boolean;
  archived_at: string | null;
};

type SummaryRow = {
  source_id: string;
  user_id: string;
  thesis: string;
  paragraphs: string[];
  memorable_quote: string | null;
  beginner_explanation: string[] | null;
  lang: "en" | "zh" | null;
};

type TakeawayRow = {
  id: string;
  source_id: string;
  user_id: string;
  position: number;
  title: string;
  detail: string;
};

type HighlightRow = {
  id: string;
  source_id: string;
  user_id: string;
  text: string;
  hue: number;
  timestamp: string | null;
  annotation: string | null;
  block_id: string | null;
  created_at: string;
};

type NoteRow = {
  source_id: string;
  user_id: string;
  body: string;
  tags: string[];
  updated_at: string;
};

type ReviewStateRow = {
  source_id: string;
  user_id: string;
  ease: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string | null;
  review_count: number;
};

/* ============================================================
   Row → domain mappers.
   ============================================================ */

function toSource(r: SourceRow): Source {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    type: r.type,
    url: r.url,
    durationSec: r.duration_sec ?? undefined,
    addedAt: r.added_at,
    collectionId: r.collection_id ?? undefined,
    tags: r.tags,
    hue: r.hue,
    takeaway: r.takeaway ?? undefined,
    notesCount: r.notes_count,
    highlightsCount: r.highlights_count,
    bookmarked: r.bookmarked,
    archived: r.archived,
    archivedAt: r.archived_at ?? undefined,
  };
}

function toSummary(r: SummaryRow): Summary {
  return {
    sourceId: r.source_id,
    thesis: r.thesis,
    paragraphs: r.paragraphs,
    memorableQuote: r.memorable_quote ?? undefined,
    beginnerExplanation: r.beginner_explanation ?? undefined,
    lang: r.lang ?? undefined,
  };
}

function toTakeaway(r: TakeawayRow): Takeaway {
  return { id: r.id, title: r.title, detail: r.detail };
}

function toHighlight(r: HighlightRow): Highlight {
  return {
    id: r.id,
    sourceId: r.source_id,
    text: r.text,
    hue: r.hue,
    timestamp: r.timestamp ?? undefined,
    annotation: r.annotation ?? undefined,
    blockId: r.block_id ?? undefined,
    createdAt: r.created_at,
  };
}

function toNote(r: NoteRow): Note {
  return {
    id: `n-${r.source_id}`,
    sourceId: r.source_id,
    body: r.body,
    tags: r.tags,
    updatedAt: r.updated_at,
  };
}

function toReviewState(r: ReviewStateRow): ReviewState {
  return {
    sourceId: r.source_id,
    ease: r.ease,
    intervalDays: r.interval_days,
    dueAt: r.due_at,
    lastReviewedAt: r.last_reviewed_at ?? undefined,
    reviewCount: r.review_count,
  };
}

/* ============================================================
   Auth helper — every write needs the current user id so we can
   satisfy the RLS `with check (auth.uid() = user_id)` clause.
   ============================================================ */

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth_required");
  return user.id;
}

/* ============================================================
   Public API — same names and signatures as mock.ts.
   ============================================================ */

export async function listSources(opts?: {
  collectionId?: string;
  tag?: string;
  archived?: boolean | "all";
}): Promise<Source[]> {
  const supabase = createClient();
  let q = supabase.from("sources").select("*").order("added_at", { ascending: false });

  const archivedFilter = opts?.archived ?? false;
  if (archivedFilter === true) q = q.eq("archived", true);
  else if (archivedFilter === false) q = q.eq("archived", false);
  /* "all" → no filter */

  if (opts?.collectionId && opts.collectionId !== "all") {
    q = q.eq("collection_id", opts.collectionId);
  }
  if (opts?.tag) q = q.contains("tags", [opts.tag]);

  const { data, error } = await q;
  if (error) throw error;
  return (data as SourceRow[]).map(toSource);
}

export async function getSource(id: string): Promise<Source | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sources").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toSource(data as SourceRow) : null;
}

/* There is no collections table yet — stored as a denormalized
   collection_id on each source. Return the distinct ids the user has
   actually used, with counts. */
export async function listCollections(): Promise<Collection[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sources").select("collection_id").not("collection_id", "is", null);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data as { collection_id: string | null }[])) {
    const id = row.collection_id;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([id, count]) => ({
    id, name: id, count,
  }));
}

export async function getSummary(sourceId: string): Promise<Summary | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("summaries").select("*").eq("source_id", sourceId).maybeSingle();
  if (error) throw error;
  return data ? toSummary(data as SummaryRow) : null;
}

export async function getTakeaways(sourceId: string): Promise<Takeaway[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("takeaways").select("*").eq("source_id", sourceId).order("position");
  if (error) throw error;
  return (data as TakeawayRow[]).map(toTakeaway);
}

export async function getHighlights(sourceId: string): Promise<Highlight[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("highlights").select("*").eq("source_id", sourceId).order("created_at");
  if (error) throw error;
  return (data as HighlightRow[]).map(toHighlight);
}

export async function addHighlight(input: {
  sourceId: string; blockId: string; text: string; hue?: number; annotation?: string;
}): Promise<Highlight> {
  const supabase = createClient();
  const user_id = await requireUserId();
  const id = `hl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const row: Omit<HighlightRow, "created_at"> = {
    id,
    source_id: input.sourceId,
    user_id,
    text: input.text.trim(),
    hue: input.hue ?? 65,
    timestamp: null,
    annotation: input.annotation ?? null,
    block_id: input.blockId,
  };
  const { data, error } = await supabase
    .from("highlights").insert(row).select("*").single();
  if (error) throw error;
  await bumpHighlightsCount(input.sourceId, +1);
  return toHighlight(data as HighlightRow);
}

export async function updateHighlightAnnotation(
  sourceId: string, highlightId: string, annotation: string
): Promise<Highlight | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("highlights")
    .update({ annotation })
    .eq("id", highlightId)
    .eq("source_id", sourceId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? toHighlight(data as HighlightRow) : null;
}

export async function deleteHighlight(sourceId: string, highlightId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("highlights")
    .delete()
    .eq("id", highlightId)
    .eq("source_id", sourceId)
    .select("id");
  if (error) throw error;
  const removed = (data ?? []).length > 0;
  if (removed) await bumpHighlightsCount(sourceId, -1);
  return removed;
}

export async function getNote(sourceId: string): Promise<Note | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes").select("*").eq("source_id", sourceId).maybeSingle();
  if (error) throw error;
  return data ? toNote(data as NoteRow) : null;
}

export async function saveNote(sourceId: string, body: string): Promise<Note> {
  const supabase = createClient();
  const user_id = await requireUserId();
  const existing = await getNote(sourceId);
  const row: NoteRow = {
    source_id: sourceId,
    user_id,
    body,
    tags: existing?.tags ?? [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("notes").upsert(row, { onConflict: "source_id" }).select("*").single();
  if (error) throw error;
  await setNotesCountFromBody(sourceId, body);
  return toNote(data as NoteRow);
}

export async function setNoteTags(sourceId: string, tags: string[]): Promise<Note> {
  const supabase = createClient();
  const user_id = await requireUserId();
  const cleanTags = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)));
  const existing = await getNote(sourceId);
  const row: NoteRow = {
    source_id: sourceId,
    user_id,
    body: existing?.body ?? "",
    tags: cleanTags,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("notes").upsert(row, { onConflict: "source_id" }).select("*").single();
  if (error) throw error;
  return toNote(data as NoteRow);
}

export async function toggleBookmark(id: string): Promise<boolean | null> {
  const supabase = createClient();
  const cur = await getSource(id);
  if (!cur) return null;
  const next = !cur.bookmarked;
  const { error } = await supabase
    .from("sources").update({ bookmarked: next }).eq("id", id);
  if (error) throw error;
  return next;
}

export async function toggleArchive(id: string): Promise<boolean | null> {
  const supabase = createClient();
  const cur = await getSource(id);
  if (!cur) return null;
  const next = !cur.archived;
  const { error } = await supabase
    .from("sources")
    .update({ archived: next, archived_at: next ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
  return next;
}

/* FK cascades clean up summaries/takeaways/highlights/notes/review_states. */
export async function deleteSource(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sources").delete().eq("id", id).select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/* ============================================================
   Review — scheduling logic stays client-side; only the state row
   lives in Postgres. Mirrors mock.ts's nextSchedule() exactly.
   ============================================================ */

export async function getReviewQueue(): Promise<ReviewCard[]> {
  /* The old ReviewCard shape isn't persisted server-side — callers
     that need the richer flow should use getReviewItems(). */
  return [];
}

export async function getReviewState(sourceId: string): Promise<ReviewState | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_states").select("*").eq("source_id", sourceId).maybeSingle();
  if (error) throw error;
  return data ? toReviewState(data as ReviewStateRow) : null;
}

export async function getReviewItems(opts: { onlyDue?: boolean } = {}): Promise<ReviewItem[]> {
  const supabase = createClient();
  const [sourcesRes, statesRes, summariesRes] = await Promise.all([
    supabase.from("sources").select("*").eq("archived", false),
    supabase.from("review_states").select("*"),
    supabase.from("summaries").select("source_id, memorable_quote").not("memorable_quote", "is", null),
  ]);
  if (sourcesRes.error) throw sourcesRes.error;
  if (statesRes.error) throw statesRes.error;
  if (summariesRes.error) throw summariesRes.error;

  const states = new Map<string, ReviewState>();
  for (const s of (statesRes.data as ReviewStateRow[])) {
    states.set(s.source_id, toReviewState(s));
  }
  const quotes = new Map<string, string>();
  for (const s of (summariesRes.data as { source_id: string; memorable_quote: string }[])) {
    quotes.set(s.source_id, s.memorable_quote);
  }

  const now = Date.now();
  const items: ReviewItem[] = [];
  for (const row of (sourcesRes.data as SourceRow[])) {
    const quote = quotes.get(row.id);
    if (!quote) continue;
    const state = states.get(row.id) ?? null;
    const due = !state || new Date(state.dueAt).getTime() <= now;
    if (opts.onlyDue && !due) continue;
    items.push({ source: toSource(row), state, quote });
  }
  items.sort((a, b) => {
    const ad = a.state ? new Date(a.state.dueAt).getTime() : 0;
    const bd = b.state ? new Date(b.state.dueAt).getTime() : 0;
    return ad - bd;
  });
  return items;
}

export async function rateReview(sourceId: string, rating: Rating): Promise<ReviewState> {
  const supabase = createClient();
  const user_id = await requireUserId();
  const prev = await getReviewState(sourceId);
  const next = nextSchedule(sourceId, prev, rating);

  const row: ReviewStateRow = {
    source_id: sourceId,
    user_id,
    ease: next.ease,
    interval_days: next.intervalDays,
    due_at: next.dueAt,
    last_reviewed_at: next.lastReviewedAt ?? null,
    review_count: next.reviewCount,
  };
  const { error } = await supabase
    .from("review_states").upsert(row, { onConflict: "source_id" });
  if (error) throw error;
  return next;
}

function nextSchedule(sourceId: string, prev: ReviewState | null, rating: Rating): ReviewState {
  const nowMs = Date.now();
  const DAY_MS = 86_400_000;
  let ease = prev?.ease ?? 2.5;
  let interval = prev?.intervalDays ?? 0;
  switch (rating) {
    case "hazy":
      ease = Math.max(1.3, ease - 0.25);
      interval = 1;
      break;
    case "getting":
      ease = Math.max(1.3, ease - 0.1);
      interval = Math.max(1, interval);
      break;
    case "solid":
      interval = Math.max(2, Math.round((interval || 1) * ease));
      break;
    case "teach":
      ease = Math.min(3.0, ease + 0.15);
      interval = Math.max(3, Math.round((interval || 1) * ease * 1.3));
      break;
  }
  return {
    sourceId,
    ease,
    intervalDays: interval,
    dueAt: new Date(nowMs + interval * DAY_MS).toISOString(),
    lastReviewedAt: new Date(nowMs).toISOString(),
    reviewCount: (prev?.reviewCount ?? 0) + 1,
  };
}

/* ============================================================
   Persist a fresh summarize response. Called by summarize-client
   after the /api/summarize route returns.
   ============================================================ */

export async function persistSummarizeResponse(res: SummarizeResponse): Promise<void> {
  const supabase = createClient();
  const user_id = await requireUserId();
  const { source, summary, takeaways, highlights } = res;

  const sourceRow: SourceRow = {
    id: source.id,
    user_id,
    title: source.title,
    author: source.author,
    type: source.type,
    url: source.url,
    duration_sec: source.durationSec ?? null,
    added_at: source.addedAt,
    collection_id: source.collectionId ?? null,
    tags: source.tags,
    hue: source.hue,
    takeaway: source.takeaway ?? null,
    notes_count: source.notesCount ?? 0,
    highlights_count: source.highlightsCount ?? highlights.length,
    bookmarked: source.bookmarked ?? false,
    archived: source.archived ?? false,
    archived_at: source.archivedAt ?? null,
  };
  const sourceIns = await supabase
    .from("sources").upsert(sourceRow, { onConflict: "id" });
  if (sourceIns.error) throw sourceIns.error;

  const summaryRow: SummaryRow = {
    source_id: source.id,
    user_id,
    thesis: summary.thesis,
    paragraphs: summary.paragraphs,
    memorable_quote: summary.memorableQuote ?? null,
    beginner_explanation: summary.beginnerExplanation ?? null,
    lang: summary.lang ?? null,
  };
  const sumIns = await supabase
    .from("summaries").upsert(summaryRow, { onConflict: "source_id" });
  if (sumIns.error) throw sumIns.error;

  /* Replace takeaways / highlights wholesale — a re-summarize may change
     both shape and count, so a delete-then-insert is the clean move. */
  const tkDel = await supabase.from("takeaways").delete().eq("source_id", source.id);
  if (tkDel.error) throw tkDel.error;
  if (takeaways.length > 0) {
    const tkRows: TakeawayRow[] = takeaways.map((t, i) => ({
      id: t.id, source_id: source.id, user_id, position: i,
      title: t.title, detail: t.detail,
    }));
    const tkIns = await supabase.from("takeaways").insert(tkRows);
    if (tkIns.error) throw tkIns.error;
  }

  const hlDel = await supabase.from("highlights").delete().eq("source_id", source.id);
  if (hlDel.error) throw hlDel.error;
  if (highlights.length > 0) {
    const hlRows: Omit<HighlightRow, "created_at">[] = highlights.map(h => ({
      id: h.id, source_id: source.id, user_id,
      text: h.text, hue: h.hue,
      timestamp: h.timestamp ?? null,
      annotation: h.annotation ?? null,
      block_id: h.blockId ?? null,
    }));
    const hlIns = await supabase.from("highlights").insert(hlRows);
    if (hlIns.error) throw hlIns.error;
  }
}

/* ============================================================
   Denormalized counters on sources. Kept in sync by the mutation
   functions above so the list view can render without a join.
   ============================================================ */

async function bumpHighlightsCount(sourceId: string, delta: number): Promise<void> {
  const cur = await getSource(sourceId);
  if (!cur) return;
  const next = Math.max(0, (cur.highlightsCount ?? 0) + delta);
  const supabase = createClient();
  await supabase.from("sources").update({ highlights_count: next }).eq("id", sourceId);
}

async function setNotesCountFromBody(sourceId: string, body: string): Promise<void> {
  const cur = await getSource(sourceId);
  if (!cur) return;
  const supabase = createClient();
  const next = body.trim().length > 0 ? 1 : 0;
  if (cur.notesCount === next) return;
  await supabase.from("sources").update({ notes_count: next }).eq("id", sourceId);
}
