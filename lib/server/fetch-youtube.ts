import "server-only";
import { Innertube } from "youtubei.js";
import { FetchError } from "./fetch-text";

/* YouTube transcript extractor.

   Uses youtubei.js — the maintained JS port of the InnerTube protocol
   yt-dlp speaks. We were rolling our own multi-client request flow,
   but YouTube tightened the bot detection on every public InnerTube
   key + client we tried (iOS, TVHTML5, Android all 400'd from
   datacenter IPs). Maintaining that fight in-house is a losing game;
   youtubei.js absorbs it and we keep our code tiny.

   Cold start adds ~500ms (the lib fetches YouTube's session data on
   first init), which is fine for our once-per-summarize call. */

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

/* Reuse one Innertube session per cold start — the lib does heavy
   lifting on first creation (session data, player JS) and is safe
   to share across requests. */
let cachedClient: Innertube | null = null;
async function client(): Promise<Innertube> {
  if (cachedClient) return cachedClient;
  cachedClient = await Innertube.create({ retrieve_player: false });
  return cachedClient;
}

type TranscriptInfo = {
  transcript?: {
    content?: {
      body?: {
        initial_segments?: { snippet?: { text?: string } }[];
      };
    };
  };
};

export async function fetchYouTubeTranscript(
  videoId: string, prefLang: "en" | "zh" = "en"
): Promise<FetchedYouTube> {
  let yt: Innertube;
  try {
    yt = await client();
  } catch {
    throw new FetchError("Could not initialize the YouTube client.", 502);
  }

  let info;
  try {
    info = await yt.getInfo(videoId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    /* youtubei.js throws InnertubeError with descriptive messages —
       surface a few common ones cleanly. */
    if (/login|sign in|bot/i.test(msg)) {
      throw new FetchError("YouTube blocked the request — try again or use a different video.", 502);
    }
    if (/unavailable|private|removed/i.test(msg)) {
      throw new FetchError("This video is unavailable, private, or has been removed.", 422);
    }
    throw new FetchError(`Could not load video: ${msg}`, 502);
  }

  const title = (info.basic_info?.title ?? "").trim() || `YouTube video ${videoId}`;
  const description = (info.basic_info?.short_description ?? "").trim();

  /* Pull transcript. Try the user's preferred language first; fall
     back to whatever default the lib hands us. */
  let transcriptText = "";
  try {
    const transcript = await info.getTranscript() as TranscriptInfo;
    /* The lib exposes language switching when multiple tracks exist —
       most videos have one or two, and the default is usually the
       creator's language (manual) which is what we want anyway. */
    const segments = transcript.transcript?.content?.body?.initial_segments ?? [];
    transcriptText = segments
      .map(s => s.snippet?.text ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/transcript|caption|disabled/i.test(msg)) {
      throw new FetchError(
        "This video has no transcript or captions — try one with subtitles enabled.", 422
      );
    }
    throw new FetchError(`Could not load transcript: ${msg}`, 502);
  }

  if (transcriptText.length < 50) {
    throw new FetchError(
      "This video's transcript was empty — try a different video.", 422
    );
  }

  const header = [
    `Title: ${title}`,
    description ? `Description: ${description.slice(0, 1000)}` : null,
    "--- TRANSCRIPT ---",
  ].filter(Boolean).join("\n");

  let text = `${header}\n${transcriptText}`;
  const MAX_CHARS = 25_000;
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  /* prefLang is currently unused — youtubei.js picks the default
     transcript track and Claude translates as needed. Wired through
     the signature so future track-selection can plug in. */
  void prefLang;

  return { url: `https://www.youtube.com/watch?v=${videoId}`, title, text };
}
