import type {
  Collection, Highlight, Note, ReviewCard, Source, SourceType,
  SummarizeRequest, SummarizeResponse, Summary, Takeaway,
} from "./types";

/* Tiny async helper so callers always await — makes swapping to a real API painless. */
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* ============================================================
   Fixture data
   ============================================================ */

const COLLECTIONS: Collection[] = [
  { id: "ml",      name: "Machine learning", count: 14 },
  { id: "phil",    name: "Philosophy",       count: 8  },
  { id: "design",  name: "Design & craft",   count: 6  },
  { id: "writing", name: "Writing",          count: 3  },
  { id: "learn",   name: "Learning itself",  count: 4  },
];

const SOURCES: Source[] = [
  {
    id: "designing-calm-software",
    title: "Designing calm software",
    author: "Linzi Berry",
    type: "video",
    url: "https://example.com/config25/calm-software",
    durationSec: 54 * 60 + 12,
    addedAt: "2026-04-17T14:30:00Z",
    collectionId: "design",
    tags: ["craft", "product"],
    hue: 220,
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
  },
];

const SUMMARIES: Record<string, Summary> = {
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

const TAKEAWAYS: Record<string, Takeaway[]> = {
  "designing-calm-software": [
    { id: "t1", title: "Calm ≠ minimal. Calm is context-aware.",   detail: "The goal isn't to remove UI — it's to make UI appear exactly when needed, and disappear when it isn't." },
    { id: "t2", title: "Notifications must earn their interruption.", detail: "Each push is a tax on attention. The test: would this still be valuable if the user discovered it an hour later on their own?" },
    { id: "t3", title: "Motion explains causality — not delight.",   detail: "Animation is a language for cause and effect. Decorative motion is the UI equivalent of talking over someone." },
    { id: "t4", title: "Default to showing less; reveal on intent.", detail: "Every on-by-default panel is a statement that the designer's priorities outweigh the user's focus." },
  ],
};

const HIGHLIGHTS: Record<string, Highlight[]> = {
  "designing-calm-software": [
    { id: "h1", sourceId: "designing-calm-software", text: "Notifications should earn their interruption.", timestamp: "04:12", hue: 85  },
    { id: "h2", sourceId: "designing-calm-software", text: "Default to showing less; reveal on intent.",   timestamp: "08:47", hue: 235 },
    { id: "h3", sourceId: "designing-calm-software", text: "Motion explains causality — not delight.",     timestamp: "12:03", hue: 170 },
    { id: "h4", sourceId: "designing-calm-software", text: "Calm is a stance toward the user's attention.", timestamp: "19:40", hue: 290 },
  ],
};

const NOTES: Record<string, Note> = {
  "designing-calm-software": {
    id: "n1",
    sourceId: "designing-calm-software",
    body: "Linzi's 'good house guest' metaphor connects directly to my onboarding work — reducing manufactured urgency. The motion-as-causality point echoes Rams' 'as little design as possible.'\n\nFollow up: find primary sources on attention economy → interruption research.",
    updatedAt: new Date().toISOString(),
    tags: ["attention", "craft", "product"],
  },
};

const REVIEW_QUEUE: ReviewCard[] = [
  {
    id: "r1",
    sourceId: "transformer-really",
    front: "What does attention actually do, in one sentence?",
    back: "Attention lets a model weigh every part of the input against every other — all at once.",
    dueAt: new Date().toISOString(),
    intervalDays: 2,
  },
];

/* ============================================================
   Public API surface — swap these with real Claude calls later.
   Every function is async so callers can't assume sync behavior.
   ============================================================ */

export async function listSources(opts?: { collectionId?: string; tag?: string }): Promise<Source[]> {
  await sleep(80);
  return SOURCES.filter(s =>
    (!opts?.collectionId || opts.collectionId === "all" || s.collectionId === opts.collectionId) &&
    (!opts?.tag || s.tags.includes(opts.tag))
  );
}

export async function getSource(id: string): Promise<Source | null> {
  await sleep(50);
  return SOURCES.find(s => s.id === id) ?? null;
}

export async function listCollections(): Promise<Collection[]> {
  await sleep(30);
  return COLLECTIONS;
}

export async function getSummary(sourceId: string): Promise<Summary | null> {
  await sleep(40);
  return SUMMARIES[sourceId] ?? null;
}

export async function getTakeaways(sourceId: string): Promise<Takeaway[]> {
  await sleep(40);
  return TAKEAWAYS[sourceId] ?? [];
}

export async function getHighlights(sourceId: string): Promise<Highlight[]> {
  await sleep(40);
  return HIGHLIGHTS[sourceId] ?? [];
}

export async function getNote(sourceId: string): Promise<Note | null> {
  await sleep(30);
  return NOTES[sourceId] ?? null;
}

export async function saveNote(sourceId: string, body: string): Promise<Note> {
  await sleep(120); /* simulate autosave */
  const existing = NOTES[sourceId];
  const next: Note = {
    id: existing?.id ?? `n-${sourceId}`,
    sourceId,
    body,
    tags: existing?.tags ?? [],
    updatedAt: new Date().toISOString(),
  };
  NOTES[sourceId] = next;
  return next;
}

export async function getReviewQueue(): Promise<ReviewCard[]> {
  await sleep(40);
  return REVIEW_QUEUE;
}

/* The headline endpoint — this one becomes a Claude API call later.
   Returns a fabricated SummarizeResponse for the URL.
   When we plug in the real Claude API, the shape stays the same. */
export async function summarize(req: SummarizeRequest): Promise<SummarizeResponse> {
  await sleep(900); /* mimic AI latency */
  const slug = slugify(req.url) || `draft-${Date.now()}`;
  const source: Source = {
    id: slug,
    title: `Summary of ${req.url}`,
    author: "Unknown",
    type: req.type,
    url: req.url,
    addedAt: new Date().toISOString(),
    tags: [],
    hue: pickHue(req.type),
  };
  return {
    source,
    summary: {
      sourceId: slug,
      thesis: "[MOCK] A calm, beginner-friendly summary of the source you pasted.",
      paragraphs: [
        "[MOCK] This is where Claude will return a distilled, editorial summary of the source.",
        "[MOCK] Until wired, mock data stands in so the UI and state flow can be verified end to end.",
      ],
    },
    takeaways: [
      { id: "mock-1", title: "Main idea, one sentence.",      detail: "[MOCK] The single most important takeaway lives here." },
      { id: "mock-2", title: "Counterintuitive implication.", detail: "[MOCK] Something worth sitting with." },
    ],
    highlights: [],
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function pickHue(type: SourceType): number {
  switch (type) {
    case "video":   return 235;
    case "podcast": return 290;
    case "blog":    return 85;
  }
}
