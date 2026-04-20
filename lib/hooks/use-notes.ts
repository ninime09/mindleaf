"use client";

import { useEffect, useRef, useState } from "react";
import { getNote, saveNote } from "@/lib/api";

/* Loads the note for `id` on mount, buffers edits in local state, and
   saves through `saveNote()` 500ms after the user stops typing. Returns
   the current value, a setter for the textarea, and the last-save time
   so the UI can surface "Saved · just now".

   Two guards keep us from writing junk into the store:
   - empty id → no-op (workspace renders this hook before the first source loads)
   - body unchanged from what we loaded → no save (so the fallback text doesn't
     get persisted just because the user opened the page) */
export function useNotes(id: string, fallback: string) {
  const [notes, setNotes] = useState(fallback);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const lastSavedBody = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getNote(id).then(n => {
      if (cancelled) return;
      const body = n?.body ?? fallback;
      setNotes(body);
      lastSavedBody.current = body;
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [id, fallback]);

  useEffect(() => {
    if (!id || !loaded) return;
    if (notes === lastSavedBody.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveNote(id, notes)
        .then(n => {
          lastSavedBody.current = notes;
          setSavedAt(new Date(n.updatedAt));
        })
        .catch(err => {
          console.error("[useNotes] saveNote failed", err);
        });
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [notes, loaded, id]);

  return { notes, setNotes, savedAt, loaded };
}

/* "Saved · 12s ago" style label, in the user's language. */
export function savedLabel(savedAt: Date | null, lang: "en" | "zh", fallback: string): string {
  if (!savedAt) return fallback;
  const elapsed = Date.now() - savedAt.getTime();
  if (lang === "zh") {
    if (elapsed < 5_000)    return "已保存 · 刚刚";
    if (elapsed < 60_000)   return `已保存 · ${Math.floor(elapsed / 1000)} 秒前`;
    if (elapsed < 3600_000) return `已保存 · ${Math.floor(elapsed / 60_000)} 分钟前`;
    return `已保存 · ${savedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (elapsed < 5_000)    return "Saved · just now";
  if (elapsed < 60_000)   return `Saved · ${Math.floor(elapsed / 1000)}s ago`;
  if (elapsed < 3600_000) return `Saved · ${Math.floor(elapsed / 60_000)}m ago`;
  return `Saved · ${savedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}
