/* Per-call dispatcher: route every public API call to either the
   real Supabase implementation (logged-in user) or the mock store
   (anonymous visitor). Same signatures as mock.ts.

   Auth state is read via supabase.auth.getSession() — that hits
   localStorage (no network), so the per-call cost is negligible.
   Doing the check on every call (rather than caching a boolean)
   means sign-in / sign-out takes effect immediately without any
   subscription bookkeeping. */

import { createClient } from "@/lib/supabase/client";
import * as mock from "./mock";
import * as supa from "./supabase";

async function isAuthed(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

export const listSources: typeof mock.listSources = async (opts) =>
  (await isAuthed() ? supa : mock).listSources(opts);

export const getSource: typeof mock.getSource = async (id) =>
  (await isAuthed() ? supa : mock).getSource(id);

export const listCollections: typeof mock.listCollections = async () =>
  (await isAuthed() ? supa : mock).listCollections();

export const getSummary: typeof mock.getSummary = async (sourceId) =>
  (await isAuthed() ? supa : mock).getSummary(sourceId);

export const getTakeaways: typeof mock.getTakeaways = async (sourceId) =>
  (await isAuthed() ? supa : mock).getTakeaways(sourceId);

export const getHighlights: typeof mock.getHighlights = async (sourceId) =>
  (await isAuthed() ? supa : mock).getHighlights(sourceId);

export const addHighlight: typeof mock.addHighlight = async (input) =>
  (await isAuthed() ? supa : mock).addHighlight(input);

export const updateHighlightAnnotation: typeof mock.updateHighlightAnnotation =
  async (sourceId, highlightId, annotation) =>
    (await isAuthed() ? supa : mock).updateHighlightAnnotation(sourceId, highlightId, annotation);

export const deleteHighlight: typeof mock.deleteHighlight = async (sourceId, highlightId) =>
  (await isAuthed() ? supa : mock).deleteHighlight(sourceId, highlightId);

export const getNote: typeof mock.getNote = async (sourceId) =>
  (await isAuthed() ? supa : mock).getNote(sourceId);

export const saveNote: typeof mock.saveNote = async (sourceId, body) =>
  (await isAuthed() ? supa : mock).saveNote(sourceId, body);

export const setNoteTags: typeof mock.setNoteTags = async (sourceId, tags) =>
  (await isAuthed() ? supa : mock).setNoteTags(sourceId, tags);

export const toggleBookmark: typeof mock.toggleBookmark = async (id) =>
  (await isAuthed() ? supa : mock).toggleBookmark(id);

export const toggleArchive: typeof mock.toggleArchive = async (id) =>
  (await isAuthed() ? supa : mock).toggleArchive(id);

export const deleteSource: typeof mock.deleteSource = async (id) =>
  (await isAuthed() ? supa : mock).deleteSource(id);

export const getReviewQueue: typeof mock.getReviewQueue = async () =>
  (await isAuthed() ? supa : mock).getReviewQueue();

export const getReviewItems: typeof mock.getReviewItems = async (opts) =>
  (await isAuthed() ? supa : mock).getReviewItems(opts);

export const getReviewState: typeof mock.getReviewState = async (sourceId) =>
  (await isAuthed() ? supa : mock).getReviewState(sourceId);

export const rateReview: typeof mock.rateReview = async (sourceId, rating) =>
  (await isAuthed() ? supa : mock).rateReview(sourceId, rating);

export const persistSummarizeResponse = async (res: Parameters<typeof mock.persistSummarizeResponse>[0]): Promise<void> => {
  if (await isAuthed()) {
    await supa.persistSummarizeResponse(res);
  } else {
    mock.persistSummarizeResponse(res);
  }
};
