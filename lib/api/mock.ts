import type {
  Collection, Highlight, Note, ReviewCard, Source, SourceType,
  SummarizeRequest, SummarizeResponse, Summary, Takeaway,
} from "./types";

/* ============================================================
   localStorage-backed store, SSR-safe.
   Each collection has a stable key and a seed value. First client-side
   access lazy-seeds; subsequent reads/writes hit localStorage.
   ============================================================ */

const NS = "mindleaf.store.";
const SEEDED_FLAG = "mindleaf.seeded";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function write<T>(key: string, value: T): void {
  if (!hasStorage()) return;
  try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch {}
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* ============================================================
   Seeds — loaded once into localStorage on first client access.
   ============================================================ */

const SEED_COLLECTIONS: Collection[] = [
  { id: "ml",      name: "Machine learning", count: 14 },
  { id: "phil",    name: "Philosophy",       count: 8  },
  { id: "design",  name: "Design & craft",   count: 6  },
  { id: "writing", name: "Writing",          count: 3  },
  { id: "learn",   name: "Learning itself",  count: 4  },
];

const SEED_SOURCES: Source[] = [
  {
    id: "designing-calm-software",
    title: "Designing calm software",
    author: "Figma Config '25",
    type: "video",
    url: "https://example.com/config25/calm-software",
    durationSec: 54 * 60 + 12,
    addedAt: "2026-04-17T14:30:00Z",
    collectionId: "design",
    tags: ["craft", "product"],
    hue: 220,
    takeaway: "Calm ≠ minimal. Calm is context-aware: appear on intent, stay quiet otherwise.",
    notesCount: 4, highlightsCount: 12,
  },
  {
    id: "transformer-really",
    title: "What is a transformer, really?",
    author: "3Blue1Brown",
    type: "video",
    url: "https://example.com/3b1b/transformer",
    durationSec: 28 * 60,
    addedAt: "2026-04-18T09:00:00Z",
    collectionId: "ml",
    tags: ["attention", "fundamentals"],
    hue: 235,
    takeaway: "Attention lets a model weigh every part of the input against every other — all at once.",
    notesCount: 3, highlightsCount: 8,
  },
  {
    id: "writing-clearly",
    title: "On writing, clearly",
    author: "Paul Graham",
    type: "blog",
    url: "https://example.com/pg/writing",
    addedAt: "2026-04-14T10:00:00Z",
    collectionId: "writing",
    tags: ["craft", "thinking"],
    hue: 85,
    takeaway: "Good writing is a side-effect of good thinking. The prose just lets the thought breathe.",
    notesCount: 2, highlightsCount: 5,
  },
  {
    id: "scaling-hypothesis",
    title: "The scaling hypothesis",
    author: "Gwern",
    type: "blog",
    url: "https://example.com/gwern/scaling",
    addedAt: "2026-04-11T18:00:00Z",
    collectionId: "ml",
    tags: ["scale", "ai"],
    hue: 260,
    takeaway: "A lot of what looks like intelligence may just be scale meeting the right objective.",
    notesCount: 6, highlightsCount: 14,
  },
];

const SEED_SUMMARIES: Record<string, Summary> = {
  "designing-calm-software": {
    sourceId: "designing-calm-software",
    thesis: "Software has gotten louder at the exact moment our attention is most fragile.",
    paragraphs: [
      "Software has gotten louder — more notifications, more onboarding moments, more manufactured urgency — at the exact moment our attention has become most fragile.",
      "Linzi's argument for calm software is less about minimalism and more about respecting the user's existing state of mind. Tools should appear when summoned, stay quiet when not, and never invent urgency that doesn't exist.",
      "She traces the idea back to Mark Weiser's 1995 essay on calm technology, then brings it forward: what does calm look like in an age of AI-driven recommendations, infinite feeds, and always-on collaboration?",
    ],
  },
};

const SEED_TAKEAWAYS: Record<string, Takeaway[]> = {
  "designing-calm-software": [
    { id: "t1", title: "Calm ≠ minimal. Calm is context-aware.",   detail: "The goal isn't to remove UI — it's to make UI appear exactly when needed, and disappear when it isn't." },
    { id: "t2", title: "Notifications must earn their interruption.", detail: "Each push is a tax on attention. The test: would this still be valuable if the user discovered it an hour later on their own?" },
    { id: "t3", title: "Motion explains causality — not delight.",   detail: "Animation is a language for cause and effect. Decorative motion is the UI equivalent of talking over someone." },
    { id: "t4", title: "Default to showing less; reveal on intent.", detail: "Every on-by-default panel is a statement that the designer's priorities outweigh the user's focus." },
  ],
};

const SEED_HIGHLIGHTS: Record<string, Highlight[]> = {
  "designing-calm-software": [
    { id: "h1", sourceId: "designing-calm-software", text: "Notifications should earn their interruption.", timestamp: "04:12", hue: 85  },
    { id: "h2", sourceId: "designing-calm-software", text: "Default to showing less; reveal on intent.",   timestamp: "08:47", hue: 235 },
    { id: "h3", sourceId: "designing-calm-software", text: "Motion explains causality — not delight.",     timestamp: "12:03", hue: 170 },
    { id: "h4", sourceId: "designing-calm-software", text: "Calm is a stance toward the user's attention.", timestamp: "19:40", hue: 290 },
  ],
};

const SEED_NOTES: Record<string, Note> = {
  "designing-calm-software": {
    id: "n1",
    sourceId: "designing-calm-software",
    body: "Linzi's 'good house guest' metaphor connects directly to my onboarding work — reducing manufactured urgency. The motion-as-causality point echoes Rams' 'as little design as possible.'\n\nFollow up: find primary sources on attention economy → interruption research.",
    updatedAt: "2026-04-17T15:00:00Z",
    tags: ["attention", "craft", "product"],
  },
};

const SEED_REVIEW: ReviewCard[] = [
  {
    id: "r1",
    sourceId: "transformer-really",
    front: "What does attention actually do, in one sentence?",
    back: "Attention lets a model weigh every part of the input against every other — all at once.",
    dueAt: "2026-04-18T00:00:00Z",
    intervalDays: 2,
  },
];

/* One-shot seeding. Runs on first client-side call to any getter/setter. */
function ensureSeeded() {
  if (!hasStorage()) return;
  if (localStorage.getItem(SEEDED_FLAG) === "1") return;
  write("collections", SEED_COLLECTIONS);
  write("sources",     SEED_SOURCES);
  write("summaries",   SEED_SUMMARIES);
  write("takeaways",   SEED_TAKEAWAYS);
  write("highlights",  SEED_HIGHLIGHTS);
  write("notes",       SEED_NOTES);
  write("review",      SEED_REVIEW);
  localStorage.setItem(SEEDED_FLAG, "1");
}

/* Utility — escape hatch for dev/testing. Wipes the mock store. */
export function __resetMockStore() {
  if (!hasStorage()) return;
  [
    "collections", "sources", "summaries", "takeaways",
    "highlights", "notes", "review",
  ].forEach(k => localStorage.removeItem(NS + k));
  localStorage.removeItem(SEEDED_FLAG);
}

/* ============================================================
   Public API surface — stable shape, ready to swap for real calls.
   ============================================================ */

export async function listSources(opts?: { collectionId?: string; tag?: string }): Promise<Source[]> {
  ensureSeeded();
  await sleep(40);
  const all = read<Source[]>("sources", SEED_SOURCES);
  return all.filter(s =>
    (!opts?.collectionId || opts.collectionId === "all" || s.collectionId === opts.collectionId) &&
    (!opts?.tag || s.tags.includes(opts.tag))
  );
}

export async function getSource(id: string): Promise<Source | null> {
  ensureSeeded();
  await sleep(30);
  const all = read<Source[]>("sources", SEED_SOURCES);
  return all.find(s => s.id === id) ?? null;
}

export async function listCollections(): Promise<Collection[]> {
  ensureSeeded();
  await sleep(20);
  return read<Collection[]>("collections", SEED_COLLECTIONS);
}

export async function getSummary(sourceId: string): Promise<Summary | null> {
  ensureSeeded();
  await sleep(30);
  const map = read<Record<string, Summary>>("summaries", SEED_SUMMARIES);
  return map[sourceId] ?? null;
}

export async function getTakeaways(sourceId: string): Promise<Takeaway[]> {
  ensureSeeded();
  await sleep(30);
  const map = read<Record<string, Takeaway[]>>("takeaways", SEED_TAKEAWAYS);
  return map[sourceId] ?? [];
}

export async function getHighlights(sourceId: string): Promise<Highlight[]> {
  ensureSeeded();
  await sleep(30);
  const map = read<Record<string, Highlight[]>>("highlights", SEED_HIGHLIGHTS);
  return map[sourceId] ?? [];
}

export async function getNote(sourceId: string): Promise<Note | null> {
  ensureSeeded();
  await sleep(20);
  const map = read<Record<string, Note>>("notes", SEED_NOTES);
  return map[sourceId] ?? null;
}

/* Permanently removes a source and everything keyed to it. Returns true
   if a source was found and removed, false otherwise. */
export async function deleteSource(id: string): Promise<boolean> {
  ensureSeeded();
  await sleep(60);
  const sources = read<Source[]>("sources", SEED_SOURCES);
  const next = sources.filter(s => s.id !== id);
  if (next.length === sources.length) return false;
  write("sources", next);

  const sumMap = read<Record<string, Summary>>("summaries", SEED_SUMMARIES);
  if (sumMap[id]) { delete sumMap[id]; write("summaries", sumMap); }

  const tkMap = read<Record<string, Takeaway[]>>("takeaways", SEED_TAKEAWAYS);
  if (tkMap[id]) { delete tkMap[id]; write("takeaways", tkMap); }

  const hlMap = read<Record<string, Highlight[]>>("highlights", SEED_HIGHLIGHTS);
  if (hlMap[id]) { delete hlMap[id]; write("highlights", hlMap); }

  const noteMap = read<Record<string, Note>>("notes", SEED_NOTES);
  if (noteMap[id]) { delete noteMap[id]; write("notes", noteMap); }

  return true;
}

export async function saveNote(sourceId: string, body: string): Promise<Note> {
  ensureSeeded();
  await sleep(80);
  const map = read<Record<string, Note>>("notes", SEED_NOTES);
  const existing = map[sourceId];
  const next: Note = {
    id: existing?.id ?? `n-${sourceId}`,
    sourceId,
    body,
    tags: existing?.tags ?? [],
    updatedAt: new Date().toISOString(),
  };
  map[sourceId] = next;
  write("notes", map);
  return next;
}

export async function getReviewQueue(): Promise<ReviewCard[]> {
  ensureSeeded();
  await sleep(30);
  return read<ReviewCard[]>("review", SEED_REVIEW);
}

/* Persists a fully-formed SummarizeResponse to localStorage.
   The real client `summarize()` (in lib/api/summarize-client.ts) calls
   the /api/summarize route and then hands the result here. */
export function persistSummarizeResponse(res: SummarizeResponse): void {
  ensureSeeded();
  const { source, summary, takeaways, highlights } = res;

  const existingSources = read<Source[]>("sources", SEED_SOURCES);
  /* Dedup by id — newer wins, moves to the front. */
  const filteredSources = existingSources.filter(s => s.id !== source.id);
  write("sources", [source, ...filteredSources]);

  const sumMap = read<Record<string, Summary>>("summaries", SEED_SUMMARIES);
  sumMap[source.id] = summary;
  write("summaries", sumMap);

  const tkMap = read<Record<string, Takeaway[]>>("takeaways", SEED_TAKEAWAYS);
  tkMap[source.id] = takeaways;
  write("takeaways", tkMap);

  const hlMap = read<Record<string, Highlight[]>>("highlights", SEED_HIGHLIGHTS);
  hlMap[source.id] = highlights;
  write("highlights", hlMap);
}

/* Mock summarize — kept exported for offline dev / tests. The default
   `summarize()` exported from lib/api/index.ts now calls the real route. */
export async function mockSummarize(req: SummarizeRequest): Promise<SummarizeResponse> {
  ensureSeeded();
  await sleep(900); /* mimic AI latency */

  const baseSlug = slugify(req.url) || `draft-${Date.now()}`;
  const existingSources = read<Source[]>("sources", SEED_SOURCES);
  const id = uniqueId(baseSlug, existingSources.map(s => s.id));

  const source: Source = {
    id,
    title: fallbackTitle(req.url),
    author: "Unknown",
    type: req.type,
    url: req.url,
    addedAt: new Date().toISOString(),
    tags: [],
    hue: pickHue(req.type),
    takeaway: "A calm, beginner-friendly summary of the source you pasted.",
    notesCount: 0,
    highlightsCount: 0,
  };

  const summary: Summary = {
    sourceId: id,
    thesis: "A calm, beginner-friendly summary of the source you pasted.",
    paragraphs: [
      "[MOCK] This is where Claude returns a distilled, editorial summary of the source.",
      "[MOCK] Used as offline fallback when the real /api/summarize route isn't available.",
    ],
  };

  const takeaways: Takeaway[] = [
    { id: `tk-${id}-1`, title: "Main idea, in one sentence.",              detail: "[MOCK] The single most important takeaway lives here." },
    { id: `tk-${id}-2`, title: "Why it might be counterintuitive.",         detail: "[MOCK] Where the idea pushes back on the usual framing." },
    { id: `tk-${id}-3`, title: "The worked example worth remembering.",     detail: "[MOCK] One concrete case that makes the abstract point land." },
  ];

  const response: SummarizeResponse = { source, summary, takeaways, highlights: [] };
  persistSummarizeResponse(response);
  return response;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function uniqueId(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function fallbackTitle(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last) return last.replace(/[-_]/g, " ").replace(/\.[a-z]+$/i, "");
    return u.hostname;
  } catch { return url.slice(0, 60); }
}

function pickHue(type: SourceType): number {
  switch (type) {
    case "video":   return 235;
    case "podcast": return 290;
    case "blog":    return 85;
  }
}
