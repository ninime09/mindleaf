import "server-only";
import { FetchError } from "./fetch-text";

/* YouTube transcript extractor.

   The default HTML scrape returns only the page chrome (nav, "subscribe",
   copyright) — none of the actual video content — so video URLs need a
   separate ingestion path. We pull the captions track that YouTube
   already exposes for accessibility.

   No API key, no third-party dep: we hit the public watch page, parse
   the `ytInitialPlayerResponse` blob it embeds, find the captionTracks
   array, fetch the first track in JSON3 format, and concatenate.

   Risks:
   - YouTube can change `ytInitialPlayerResponse` shape — if they do,
     transcript fetch fails and the user gets a clean error.
   - Some videos have no captions at all (creator disabled them, very
     new uploads, music videos). We surface a friendly error.
   - Auto-translated captions are sometimes lower quality than the
     creator's manual track; we prefer manual when both exist. */

const YOUTUBE_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
]);

export function isYouTubeUrl(url: string): boolean {
  try { return YOUTUBE_HOSTS.has(new URL(url).hostname); } catch { return false; }
}

/* Returns the 11-char video id, or null if the URL is a playlist /
   channel / unparsable variant. */
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

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string; /* "asr" = auto-generated; absent = manual */
  name?: { simpleText?: string };
};

type Json3Event = {
  segs?: { utf8?: string }[];
};

const FETCH_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type FetchedYouTube = { url: string; title: string; text: string };

type PlayerResponse = {
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
  videoDetails?: { title?: string; shortDescription?: string };
  playabilityStatus?: { status?: string; reason?: string };
};

/* InnerTube clients we try, in order. YouTube treats different clients
   with different leniency — Android has been getting harder to spoof
   from datacenter IPs through 2025/2026, while iOS and TVHTML5 (the
   embedded-player client used by smart TVs) still pass. Each entry has
   its own host + API key + context shape; these constants are public
   (hardcoded in YouTube's own apps, also used by yt-dlp). */
type InnertubeClient = {
  name: string;
  host: string;
  apiKey: string;
  userAgent: string;
  context: Record<string, unknown>;
};

const INNERTUBE_CLIENTS: InnertubeClient[] = [
  {
    name: "IOS",
    host: "youtubei.googleapis.com",
    apiKey: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    userAgent: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.45.4",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iPhone",
        osVersion: "18.1.0.22B83",
        hl: "en",
        gl: "US",
      },
    },
  },
  {
    name: "TVHTML5",
    host: "www.youtube.com",
    apiKey: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    userAgent: "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        hl: "en",
        gl: "US",
      },
      thirdParty: {
        embedUrl: "https://www.youtube.com/",
      },
    },
  },
  {
    name: "ANDROID",
    host: "www.youtube.com",
    apiKey: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    userAgent: "com.google.android.youtube/19.45.36 (Linux; U; Android 14) gzip",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.45.36",
        androidSdkVersion: 34,
        hl: "en",
        gl: "US",
        userAgent: "com.google.android.youtube/19.45.36 (Linux; U; Android 14) gzip",
      },
    },
  },
];

async function fetchPlayerResponse(videoId: string): Promise<PlayerResponse> {
  let lastError: Error | null = null;
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const url = `https://${client.host}/youtubei/v1/player?key=${client.apiKey}&prettyPrint=false`;
      const body = { context: client.context, videoId };
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.userAgent,
          "X-YouTube-Client-Name": client.name === "IOS" ? "5" : client.name === "TVHTML5" ? "85" : "3",
          "X-YouTube-Client-Version": (client.context.client as { clientVersion: string }).clientVersion,
          "Origin": "https://www.youtube.com",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        lastError = new FetchError(`YouTube ${client.name} client returned ${res.status}.`, 502);
        continue;
      }
      const player = (await res.json()) as PlayerResponse;
      /* Some clients respond 200 OK but with playabilityStatus=ERROR;
         that's not really a "success" for our purposes. Try the next
         client unless we got captions. */
      const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      const status = player.playabilityStatus?.status;
      if (tracks.length === 0 && status && status !== "OK") {
        lastError = new FetchError(
          `YouTube ${client.name} client: ${player.playabilityStatus?.reason || status}`, 422
        );
        continue;
      }
      return player;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }
  throw lastError ?? new FetchError("All YouTube clients failed.", 502);
}

export async function fetchYouTubeTranscript(
  videoId: string, prefLang: "en" | "zh" = "en"
): Promise<FetchedYouTube> {
  const player = await fetchPlayerResponse(videoId);

  /* Only treat truly fatal statuses as fatal — LOGIN_REQUIRED on
     captions-only flows is sometimes a false alarm because we already
     have the captionTracks. Let the next check decide. */
  const status = player.playabilityStatus?.status;
  const fatal = new Set(["ERROR", "UNPLAYABLE", "LIVE_STREAM_OFFLINE"]);
  if (status && fatal.has(status)) {
    throw new FetchError(
      `This video isn't playable (${player.playabilityStatus?.reason || status}).`, 422
    );
  }

  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) {
    /* Distinguish "video gated" from "no captions" so the user knows
       which one they hit. */
    if (status && status !== "OK") {
      throw new FetchError(
        `YouTube blocked the captions for this video (${player.playabilityStatus?.reason || status}). Try a different video.`,
        422
      );
    }
    throw new FetchError(
      "This video has no captions or transcript — try one with subtitles enabled.", 422
    );
  }

  /* Track preference:
     1. manual track in the user's preferred output language
     2. manual track in any language
     3. auto-generated (asr) track in preferred language
     4. anything */
  const isManual = (t: CaptionTrack) => t.kind !== "asr";
  const inPref   = (t: CaptionTrack) => (t.languageCode ?? "").toLowerCase().startsWith(prefLang);
  const pick =
    tracks.find(t => isManual(t) && inPref(t)) ??
    tracks.find(t => isManual(t)) ??
    tracks.find(t => inPref(t)) ??
    tracks[0];

  const title = (player.videoDetails?.title ?? "").trim() || `YouTube video ${videoId}`;

  /* Fetch in JSON3 — easiest format to walk. The baseUrl already
     carries auth params; just append fmt. */
  const captionUrl = pick.baseUrl + (pick.baseUrl.includes("?") ? "&" : "?") + "fmt=json3";
  let capRes: Response;
  try {
    capRes = await fetchWithTimeout(captionUrl);
  } catch {
    throw new FetchError("Could not fetch the captions track.", 502);
  }
  if (!capRes.ok) {
    throw new FetchError(`Captions endpoint returned ${capRes.status}.`, 502);
  }

  let json: { events?: Json3Event[] };
  try {
    json = await capRes.json();
  } catch {
    throw new FetchError("Captions track wasn't valid JSON.", 502);
  }

  const events = json.events ?? [];
  const lines: string[] = [];
  for (const ev of events) {
    if (!ev.segs) continue;
    const line = ev.segs.map(s => s.utf8 ?? "").join("").trim();
    if (line) lines.push(line);
  }
  /* Concat with newlines so the model sees roughly per-cue boundaries
     (helps it find natural paragraph breaks). */
  let text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  /* Prepend the title + description so the model has context that
     captions don't always carry (numbers, names, framing). */
  const desc = (player.videoDetails?.shortDescription ?? "").trim();
  const header = [
    `Title: ${title}`,
    desc ? `Description: ${desc.slice(0, 1000)}` : null,
    "--- TRANSCRIPT ---",
  ].filter(Boolean).join("\n");
  text = `${header}\n${text}`;

  /* Soft cap matches the HTML path's MAX_CHARS budget. */
  const MAX_CHARS = 25_000;
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  if (text.length < 200) {
    throw new FetchError("Captions track was empty after parsing.", 422);
  }

  return { url: `https://www.youtube.com/watch?v=${videoId}`, title, text };
}
