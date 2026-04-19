import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { SummarizeResponse } from "@/lib/api/types";

/* Disk-backed cache for /api/summarize responses, keyed by (url + type
   + lang). Intended as a dev quality-of-life feature: iterating on the
   prompt while pointing at the same article doesn't burn another
   Claude call. 7-day TTL; bypass with ?fresh=1 on the request.

   Lives under .cache/summaries (gitignored). Writes are best-effort —
   a read-only production filesystem just degrades to always-miss. */

const CACHE_DIR = path.join(process.cwd(), ".cache", "summaries");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheKeyInput = { url: string; type: string; lang: string };

function keyFor({ url, type, lang }: CacheKeyInput): string {
  const raw = `${url}|${type}|${lang}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

type CacheEntry = {
  createdAt: string;
  request: CacheKeyInput;
  response: SummarizeResponse;
};

export async function readCached(input: CacheKeyInput): Promise<SummarizeResponse | null> {
  try {
    const key = keyFor(input);
    const file = path.join(CACHE_DIR, `${key}.json`);
    const raw = await fs.readFile(file, "utf-8");
    const entry = JSON.parse(raw) as CacheEntry;
    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > TTL_MS) return null;
    return entry.response;
  } catch {
    return null;
  }
}

export async function writeCached(
  input: CacheKeyInput, response: SummarizeResponse
): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const key = keyFor(input);
    const file = path.join(CACHE_DIR, `${key}.json`);
    const entry: CacheEntry = {
      createdAt: new Date().toISOString(),
      request: input,
      response,
    };
    await fs.writeFile(file, JSON.stringify(entry, null, 2));
  } catch {
    /* best-effort — never block the response */
  }
}
