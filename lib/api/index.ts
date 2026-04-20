/* Public API entry point.
   Reads + persistence are dispatched per-call by lib/api/dispatch.ts:
     - signed-in user → Supabase (lib/api/supabase.ts)
     - anonymous     → localStorage mock (lib/api/mock.ts)
   summarize() calls the real /api/summarize route handler, which talks
   to Claude. To run fully offline, swap the summarize export for
   `mockSummarize` from ./mock. */

export * from "./types";

export {
  listSources,
  getSource,
  listCollections,
  getSummary,
  getTakeaways,
  getHighlights,
  addHighlight,
  updateHighlightAnnotation,
  deleteHighlight,
  getNote,
  saveNote,
  setNoteTags,
  toggleBookmark,
  toggleArchive,
  deleteSource,
  getReviewQueue,
  getReviewItems,
  getReviewState,
  rateReview,
  persistSummarizeResponse,
} from "./dispatch";

export { mockSummarize, __resetMockStore } from "./mock";

export { summarize, AuthRequiredError } from "./summarize-client";
