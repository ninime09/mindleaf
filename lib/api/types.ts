/* Domain types shared between mock and real API implementations. */

export type SourceType = "blog" | "podcast" | "video";

export type Source = {
  id: string;
  title: string;
  author: string;
  type: SourceType;
  url: string;
  durationSec?: number;
  addedAt: string; /* ISO */
  collectionId?: string;
  tags: string[];
  hue: number;
  /* List-view extras — populated at summarize time, kept on the source for fast list rendering. */
  takeaway?: string;
  notesCount?: number;
  highlightsCount?: number;
  bookmarked?: boolean;
};

export type Summary = {
  sourceId: string;
  thesis: string;     /* one-line "what is this" */
  paragraphs: string[]; /* long form */
  memorableQuote?: string;        /* the one sentence worth remembering */
  beginnerExplanation?: string[]; /* a separate explanation for someone new to the idea */
  lang?: "en" | "zh";             /* the language the summary was generated in */
};

export type Takeaway = {
  id: string;
  title: string;
  detail: string;
};

export type Highlight = {
  id: string;
  sourceId: string;
  text: string;
  hue: number;
  timestamp?: string;   /* HH:MM or HH:MM:SS — used for video/podcast source highlights */
  annotation?: string;  /* the user's note attached to this highlight */
  blockId?: string;     /* which block in the article this highlight belongs to (e.g. "summary-0") */
  createdAt?: string;   /* ISO timestamp when the user created it */
};

export type Note = {
  id: string;
  sourceId: string;
  body: string;
  updatedAt: string;
  tags: string[];
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  count: number;
};

export type ReviewCard = {
  id: string;
  sourceId: string;
  front: string;  /* question / prompt */
  back: string;   /* answer / canonical phrasing */
  dueAt: string;  /* ISO */
  intervalDays: number;
};

/* Per-source spaced-repetition state. One entry per source that has
   been reviewed at least once. Sources without a state are treated as
   "never reviewed" — effectively due on first visit. */
export type ReviewState = {
  sourceId: string;
  ease: number;          /* SM-2 ease factor — starts at 2.5 */
  intervalDays: number;  /* days until next review */
  dueAt: string;         /* ISO */
  lastReviewedAt?: string;
  reviewCount: number;
};

export type Rating = "hazy" | "getting" | "solid" | "teach";

/* A review item is a source + its current state + the quote to recall. */
export type ReviewItem = {
  source: Source;
  state: ReviewState | null;
  quote: string;
};

export type SummarizeRequest = {
  url: string;
  type: SourceType;
  lang?: "en" | "zh";  /* target output language; defaults to en on the server */
};

export type SummarizeResponse = {
  source: Source;
  summary: Summary;
  takeaways: Takeaway[];
  highlights: Highlight[];
};
