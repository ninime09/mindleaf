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
};

export type Summary = {
  sourceId: string;
  thesis: string;     /* one-line "what is this" */
  paragraphs: string[]; /* long form */
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
  timestamp?: string; /* HH:MM or HH:MM:SS */
  hue: number;
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

export type SummarizeRequest = {
  url: string;
  type: SourceType;
  /* Later: user preferences, reading level, language, etc. */
};

export type SummarizeResponse = {
  source: Source;
  summary: Summary;
  takeaways: Takeaway[];
  highlights: Highlight[];
};
