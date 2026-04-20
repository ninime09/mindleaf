import "server-only";
import { FetchError } from "./fetch-text";

/* YouTube transcript extractor — calls Supadata's transcript API.

   Why a third-party service: YouTube actively blocks datacenter IPs
   (Vercel, AWS, etc.) with bot detection that no public InnerTube
   client / API key combo currently bypasses. Maintaining a workaround
   in-house is a losing fight; Supadata runs from IPs YouTube tolerates
   and gives us a one-call API with a 100/month free tier. Their docs:
   https://supadata.ai/documentation

   Required env: SUPADATA_API_KEY. Without it, YouTube URLs cleanly
   return a 500 explaining the server isn't configured for them. */

const YOUTUBE_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
]);

export function isYouTubeUrl(url: string): boolean {
  try { return YOUTUBE_HOSTS.has(new URL(url).hostname); } catch { return false; }
}

export function extractVideoId(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.hostname === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id || null;
  }
  if (u.pathname === "/watch") return u.searchParams.get("v");
  if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
  if (u.pathname.startsWith("/embed/"))  return u.pathname.split("/")[2] ?? null;
  if (u.pathname.startsWith("/live/"))   return u.pathname.split("/")[2] ?? null;
  return null;
}

export type FetchedYouTube = { url: string; title: string; text: string };

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CHARS = 25_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type SupadataResponse = {
  content?: string;
  lang?: string;
  availableLangs?: string[];
};

export async function fetchYouTubeTranscript(
  videoId: string, prefLang: "en" | "zh" = "en"
): Promise<FetchedYouTube> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new FetchError(
      "YouTube transcript ingestion isn't configured on this server (missing SUPADATA_API_KEY).",
      500,
    );
  }

  /* text=true gives us the full transcript as one string; without it
     we'd get timed segments and have to concat ourselves. The lang
     hint asks Supadata to prefer a track in that language when the
     video has multiple. */
  const url = new URL("https://api.supadata.ai/v1/youtube/transcript");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("text", "true");
  url.searchParams.set("lang", prefLang);

  let res: Response;
  try {
    res = await fetchWithTimeout(url.toString(), {
      headers: { "x-api-key": apiKey },
    });
  } catch {
    throw new FetchError("Could not reach the transcript service.", 502);
  }

  if (!res.ok) {
    /* Map common Supadata statuses to user-facing messages. */
    if (res.status === 404) {
      throw new FetchError(
        "This video has no transcript or is unavailable — try one with subtitles enabled.",
        422,
      );
    }
    if (res.status === 429) {
      throw new FetchError(
        "Transcript service is at capacity. Try again in a moment.",
        503,
      );
    }
    if (res.status === 401 || res.status === 403) {
      console.error(`[supadata] auth failed (${res.status}) — check SUPADATA_API_KEY`);
      throw new FetchError(
        "YouTube ingestion is misconfigured on this server. Try a non-YouTube source.",
        500,
      );
    }
    /* Surface the body for debugging on Vercel Function Logs. */
    let body = "";
    try { body = (await res.text()).slice(0, 300); } catch {}
    console.error(`[supadata] ${res.status}: ${body}`);
    throw new FetchError(`Transcript service returned ${res.status}.`, 502);
  }

  let data: SupadataResponse;
  try {
    data = (await res.json()) as SupadataResponse;
  } catch {
    throw new FetchError("Transcript service returned invalid JSON.", 502);
  }

  const transcriptText = (data.content ?? "").trim();
  if (transcriptText.length < 50) {
    throw new FetchError(
      "This video's transcript was empty — try a different video.",
      422,
    );
  }

  /* Claude returns its own `title` field from the structured output, so
     the placeholder here only matters as a fallback when Claude fails
     to extract one. The transcript itself almost always carries the
     title in the first few seconds. */
  const title = `YouTube video ${videoId}`;
  const header = `Title: ${title}\n--- TRANSCRIPT ---\n`;
  let text = header + transcriptText;
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    text,
  };
}
