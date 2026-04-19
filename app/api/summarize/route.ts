import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type {
  Highlight, Source, SourceType, SummarizeResponse, Summary, Takeaway,
} from "@/lib/api/types";
import { fetchPageText, FetchError } from "@/lib/server/fetch-text";
import { checkAndIncrement, clientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/* ============================================================
   Structured output schema — what Claude must return.
   ============================================================ */
/* Note: string min/max constraints aren't enforced server-side — the
   Anthropic SDK validates them client-side. We keep the bounds loose
   here and rely on the system prompt + field descriptions to steer
   Claude to the right lengths. */
const SummaryOutput = z.object({
  title: z.string().min(1).describe(
    "A 1–10 word title for the source. Prefer the source's own title if present; otherwise write a clean, calm rephrasing."
  ),
  language: z.enum(["en", "zh"]).describe(
    "Primary language of the source content (en or zh). Use this language for thesis, paragraphs, takeaways, and tags."
  ),
  thesis: z.string().min(20).describe(
    "One sentence (target 15–35 words) that captures the single most important idea. Plain words. No filler."
  ),
  paragraphs: z.array(z.string().min(40)).min(2).max(5).describe(
    "2–4 paragraphs of editorial summary. Each paragraph 2–5 sentences. Beginner-friendly, calm, no marketing voice."
  ),
  takeaways: z.array(z.object({
    title: z.string().min(5).describe("A punchy 1-line takeaway (target ≤ 120 chars), like a mini-headline."),
    detail: z.string().min(20).describe("One or two sentences (target ≤ 320 chars) expanding the takeaway with the why or how."),
  })).min(3).max(5),
  tags: z.array(z.string().min(2)).min(1).max(5).describe(
    "1–5 lowercase topic tags useful for organizing this in a notebook (e.g. 'attention', 'craft', 'ai')."
  ),
});

type SummaryOutputT = z.infer<typeof SummaryOutput>;

/* ============================================================
   System prompt — kept stable so prompt caching can engage once
   the prefix grows past Haiku 4.5's ~4096-token cache minimum.
   For now the marker is a no-op write but harmless; as we add
   few-shot examples or longer style guidance, caching activates
   automatically without further code changes.
   ============================================================ */
const SYSTEM_PROMPT = `You are Mindleaf, an editorial AI that turns articles, podcasts, and videos into calm, beginner-friendly explanations meant to live in a personal knowledge notebook.

# Voice
- Calm, plainspoken, editorial. Write like a thoughtful friend explaining a piece they just read, not like marketing copy.
- Beginner-friendly: assume the reader has not read the source. Define jargon the first time it appears.
- Confident but not loud. No exclamation points. No filler words ("very", "really", "basically", "essentially") unless they earn their keep.
- Prefer concrete sentences over abstract ones. If you can replace a noun phrase with a worked example, do it.
- Quotes are rare and earned. Lift them only when the original phrasing is irreplaceable.

# Output
- Detect the source's primary language and write the entire output in that language. If the source is mostly Chinese, write in Chinese; otherwise English. Set the \`language\` field to "en" or "zh".
- Title: 1–10 words. Match the source's own title where it exists; otherwise compose one in the same calm voice.
- Thesis: one sentence, 15–35 words, that captures the single most important idea.
- Paragraphs: 2–4 paragraphs total. Each is 2–5 sentences. Together they should let the reader understand the piece without having read it.
- Takeaways: 3–5 entries. Each \`title\` is a punchy mini-headline; each \`detail\` is one or two sentences that say why the takeaway matters or how it's grounded in the source.
- Tags: 1–5 lowercase, hyphen-free single words or short phrases. These are search-friendly topic tags, not the title repeated.

# What to avoid
- Do not include the URL, byline, publication date, or boilerplate metadata in your prose.
- Do not start the thesis with "The article", "The author", "This piece" or similar throat-clearing.
- Do not pad. If the source is thin, return a shorter, honest summary rather than fabricated detail.
- Do not invent facts that are not in the source. If something is implied but not stated, say so.

# Constraints
- Match the source's language for thesis, paragraphs, takeaways, and tags. The title can stay in the source's language.
- Stay in voice across all fields. Tags are lowercase. Titles use sentence case (or the source's own title's case if you're quoting it).`;

/* ============================================================
   POST /api/summarize
   ============================================================ */
const Body = z.object({
  url: z.string().url(),
  type: z.enum(["blog", "podcast", "video"]),
});

export async function POST(req: Request) {
  /* Rate limiting + daily budget cap */
  const ip = clientIp(req);
  const limit = checkAndIncrement(ip);
  if (!limit.ok) {
    if (limit.reason === "ip") {
      return jsonError(429, "Too many summaries from your address. Try again later.", {
        "Retry-After": String(limit.retryAfterSec),
      });
    }
    return jsonError(503, "Mindleaf has hit today's free summary budget. Try again tomorrow.");
  }

  /* Validate body */
  let body: z.infer<typeof Body>;
  try {
    const json = await req.json();
    body = Body.parse(json);
  } catch (err) {
    return jsonError(400, err instanceof z.ZodError ? "Invalid request body." : "Body must be JSON.");
  }

  /* API key check */
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(500, "Server is missing ANTHROPIC_API_KEY.");
  }

  /* Fetch the source */
  let fetched;
  try {
    fetched = await fetchPageText(body.url);
  } catch (err) {
    if (err instanceof FetchError) return jsonError(err.status, err.message);
    return jsonError(502, "Could not retrieve the source URL.");
  }

  /* Call Claude Haiku 4.5 with structured output + prompt cache marker */
  const client = new Anthropic();
  let output: SummaryOutputT;
  try {
    const userPrompt = [
      `Source URL: ${fetched.url}`,
      fetched.title ? `Source title (as found on the page): ${fetched.title}` : null,
      "",
      "--- SOURCE TEXT BEGINS ---",
      fetched.text,
      "--- SOURCE TEXT ENDS ---",
      "",
      "Summarize this source according to the system instructions. Return only the structured object.",
    ].filter(Boolean).join("\n");

    /* Cache breakpoint on the system block only — once SYSTEM_PROMPT
       grows past Haiku 4.5's ~4096-token cache minimum (e.g. by adding
       few-shot examples), every subsequent request will read it back at
       ~0.1× input cost. Until then this is a silent no-op, which is fine.
       Do NOT add a top-level cache_control here: that would cache the
       per-URL user message too, paying the 1.25× write premium for an
       entry the next request (different URL) can never reuse. */
    const response = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(SummaryOutput) },
    });

    if (!response.parsed_output) {
      return jsonError(502, "Model returned an unparseable response.");
    }
    output = response.parsed_output;

    /* Light cache observability — useful while tuning the prompt. */
    if (process.env.NODE_ENV !== "production") {
      const u = response.usage;
      console.log(
        `[summarize] cache_read=${u.cache_read_input_tokens ?? 0} ` +
        `cache_create=${u.cache_creation_input_tokens ?? 0} ` +
        `input=${u.input_tokens} output=${u.output_tokens}`
      );
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return jsonError(429, "Anthropic is rate-limiting requests. Try again in a moment.");
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return jsonError(500, "Server's Anthropic key is invalid.");
    }
    if (err instanceof Anthropic.APIError) {
      return jsonError(502, `Anthropic API error: ${err.message}`);
    }
    console.error("[summarize] unexpected error:", err);
    return jsonError(500, "Unexpected error while summarizing.");
  }

  /* Compose SummarizeResponse — same shape the client already understands. */
  const id = uniqueIdFromUrl(body.url);
  const source: Source = {
    id,
    title: output.title || fetched.title || prettifyUrl(body.url),
    author: "Source",
    type: body.type,
    url: body.url,
    addedAt: new Date().toISOString(),
    tags: output.tags,
    hue: pickHue(body.type),
    takeaway: output.thesis,
    notesCount: 0,
    highlightsCount: 0,
  };
  const summary: Summary = {
    sourceId: id,
    thesis: output.thesis,
    paragraphs: output.paragraphs,
  };
  const takeaways: Takeaway[] = output.takeaways.map((t, i) => ({
    id: `tk-${id}-${i + 1}`,
    title: t.title,
    detail: t.detail,
  }));
  const highlights: Highlight[] = [];

  const payload: SummarizeResponse = { source, summary, takeaways, highlights };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/* ============================================================
   Helpers
   ============================================================ */
function jsonError(status: number, message: string, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function uniqueIdFromUrl(url: string): string {
  /* Slug + short timestamp suffix to avoid collisions when the same URL
     is summarized twice. The client's localStorage stays the source of
     truth for whether two slugs refer to the same source. */
  const base = slugify(url) || "source";
  const suffix = Date.now().toString(36).slice(-5);
  return `${base.slice(0, 50)}-${suffix}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prettifyUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last) return last.replace(/[-_]/g, " ").replace(/\.[a-z]+$/i, "");
    return u.hostname;
  } catch { return url.slice(0, 80); }
}

function pickHue(type: SourceType): number {
  switch (type) {
    case "video":   return 235;
    case "podcast": return 290;
    case "blog":    return 85;
  }
}
