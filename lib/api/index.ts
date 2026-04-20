/* Public API entry point.
   Read endpoints + persistence are localStorage-backed (mock.ts).
   summarize() calls the real /api/summarize route handler, which in turn
   calls Claude Haiku 4.5. To run fully offline, swap the summarize export
   for `mockSummarize` from ./mock. */

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
  mockSummarize,
  __resetMockStore,
} from "./mock";

export { summarize, AuthRequiredError } from "./summarize-client";
