import "server-only";

/* Server-only utility: fetch a URL and return readable text.
   Naive HTML→text extraction (sufficient for typical articles, podcasts'
   show-notes pages, blog posts). For SPAs requiring JS execution this
   will return an empty shell — that's an acceptable failure mode for the
   MVP; a future upgrade can swap in Jina Reader, Mercury, or a headless
   browser without changing the surface. */

const MAX_BYTES = 5 * 1024 * 1024;     /* 5 MB hard cap */
const MAX_CHARS = 25_000;              /* truncate text fed to the model */
const FETCH_TIMEOUT_MS = 12_000;

export class FetchError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

/* Best-effort SSRF block. Not bulletproof (no DNS resolution, no IPv6 range
   parsing) but rejects the obvious local/private targets a careless paste
   might hit. Production should resolve hostnames and check the IP. */
function isSafeUrl(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  return true;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return decodeText(og[1]);
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t?.[1]) return decodeText(t[1]).trim();
  return undefined;
}

function decodeText(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export type Fetched = { url: string; title?: string; text: string };

export async function fetchPageText(rawUrl: string): Promise<Fetched> {
  const url = rawUrl.trim();
  if (!isSafeUrl(url)) {
    throw new FetchError("URL is not allowed (must be http(s) and not point to a private host).", 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "MindleafBot/0.1 (+https://github.com/ninime09/mindleaf)",
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        "Accept-Language": "en,zh-CN;q=0.8",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchError("Source took too long to respond.", 504);
    }
    throw new FetchError("Could not reach the source URL.", 502);
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new FetchError(`Source returned ${res.status}.`, 502);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("html") || contentType.includes("xml");
  const isText = contentType.startsWith("text/") || contentType.includes("json");
  if (!isHtml && !isText) {
    throw new FetchError(`Unsupported content type: ${contentType || "unknown"}.`, 415);
  }

  /* Read with a hard size cap so a giant page can't OOM the worker. */
  const reader = res.body?.getReader();
  if (!reader) throw new FetchError("Source returned no body.", 502);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new FetchError("Source page exceeds the 5 MB size limit.", 413);
      }
      chunks.push(value);
    }
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { buf.set(c, offset); offset += c.byteLength; }
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);

  const title = isHtml ? extractTitle(raw) : undefined;
  const text = (isHtml ? htmlToText(raw) : raw.replace(/\s+/g, " ").trim()).slice(0, MAX_CHARS);

  if (text.length < 80) {
    throw new FetchError("Source page is too short or could not be parsed as text.", 422);
  }

  return { url, title, text };
}
