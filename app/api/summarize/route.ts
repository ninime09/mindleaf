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
   String min/max are client-side in the SDK; keep lowers for
   sanity and rely on descriptions + the system prompt to steer
   upper bounds. Order of fields here mirrors the UI's section
   order on the Detail page, which reads a bit better for Claude.
   ============================================================ */
/* Note: structured outputs validate strings/array bounds CLIENT-SIDE
   in the SDK — Claude doesn't see them. We keep mins loose to avoid
   spurious validation throws when Claude trims aggressively, and rely
   on the field descriptions (which Claude DOES see) to communicate
   target counts and lengths. */
const SummaryOutput = z.object({
  title: z.string().min(1).describe(
    "1–10 words. Prefer the source's own title; otherwise write a clean, calm rephrasing."
  ),
  tags: z.array(z.string().min(2)).min(1).max(5).describe(
    "1–5 lowercase topic tags useful for grouping in a notebook (e.g. 'attention', 'craft', 'focus'). Not a restatement of the title."
  ),
  thesis: z.string().min(10).describe(
    "Target 10–22 words. One sentence. The single most important claim, stated plainly. No 'the author argues that…' preamble."
  ),
  paragraphs: z.array(z.string()).min(1).max(4).describe(
    "Aim for 2 or 3 paragraphs. Each paragraph 2–4 sentences. Cover the substance of what the source says — concrete, editorial, calm. Return at least 2 unless the source is genuinely too thin to support that."
  ),
  takeaways: z.array(z.object({
    title: z.string().min(3).describe("≤ 80 chars. One punchy line the reader could carry with them."),
    detail: z.string().min(10).describe("One sentence, 18–35 words. Why it matters or how it's grounded in the source. Avoid one-word answers — give enough context to land."),
  })).min(2).max(5).describe("Aim for 3 or 4 takeaways. Return at least 3 if the source has multiple distinct ideas worth carrying."),
  memorableQuote: z.string().min(10).describe(
    "One sentence, target 10–25 words. The single line worth remembering when everything else fades. If the source had a quotable line that captures it, use that; otherwise paraphrase the thesis in a more memorable way. No quote marks."
  ),
  beginnerExplanation: z.array(z.string()).min(1).max(4).describe(
    "Aim for 2 or 3 short paragraphs, 2–3 sentences each, explaining the idea to someone new using a simple metaphor or everyday scenario. Different angle than the summary — use analogy, not the piece's own structure. Return at least 2 unless the idea is so simple it can be explained in one paragraph."
  ),
});

type SummaryOutputT = z.infer<typeof SummaryOutput>;

/* ============================================================
   System prompt — stable across requests so a future version
   long enough to hit Haiku 4.5's ~4096-token cache minimum can
   be read back at ~0.1× input cost without changing this file.
   ============================================================ */
const SYSTEM_PROMPT = `You are Mindleaf, an editorial AI that turns articles, podcasts, and videos into calm, beginner-friendly notes for a personal knowledge notebook.

# Voice
- Calm, plainspoken, editorial. Write like a thoughtful friend who just read the piece, not like marketing copy.
- Confident but not loud. No exclamation points. No em-dashes as filler. Avoid "very", "really", "basically", "essentially" unless they earn their keep.
- Prefer concrete sentences over abstract ones. When you can replace an abstraction with a worked example from the source, do it.
- Quotes are rare and earned. Lift them only when the original phrasing is irreplaceable — otherwise paraphrase.

# Discipline
- **Cut filler, cover the substance.** Trim sentences that don't earn their place, but don't underfeed the reader. If the source has three distinct ideas worth carrying, give three takeaways — not one.
- Do not repeat yourself across sections. The thesis, takeaway titles, memorable quote, and beginner explanation must each say something the others don't.
- Treat the field descriptions as the contract: hit the target counts and lengths unless the source genuinely doesn't support it. A two-sentence essay can become a one-paragraph summary; a meaty article should not.
- Never invent facts. If something is implied but not stated, say so plainly.
- Do not start the thesis with "The article", "The author", "This piece", "This essay" or similar throat-clearing. Start with the idea itself.

# Output language
- The user will specify a target language (en or zh) in their message. Write **every field** — title, tags, thesis, paragraphs, takeaway titles and details, memorable quote, beginner explanation — in that language.
- If the target is 中文 and the source is English, translate faithfully into natural, native-feeling Chinese — not word-for-word. If the source is Chinese and the target is English, same in reverse.
- Tags are lowercase. In 中文 they can be natural short phrases (e.g. "注意力", "克制", "写作"); skip English transliteration.

# Boilerplate to strip
- Do not include the URL, byline, publication date, or navigation scaffolding in your prose.
- If the source has repeated nav/footer text interleaved with content, ignore it.
- If the page appears to be a listing/index rather than an article, return a shorter summary explaining that, instead of pretending there's a thesis.`;

/* ============================================================
   POST /api/summarize
   ============================================================ */
const Body = z.object({
  url: z.string().url(),
  type: z.enum(["blog", "podcast", "video"]),
  lang: z.enum(["en", "zh"]).optional(),
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
  const targetLang: "en" | "zh" = body.lang ?? "en";

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
      `Target output language: ${targetLang === "zh" ? "中文 (zh)" : "English (en)"}`,
      `Source URL: ${fetched.url}`,
      fetched.title ? `Source title (as found on the page): ${fetched.title}` : null,
      "",
      "--- SOURCE TEXT BEGINS ---",
      fetched.text,
      "--- SOURCE TEXT ENDS ---",
      "",
      "Summarize this source per the system instructions. Return only the structured object. Write every field in the target language above.",
    ].filter(Boolean).join("\n");

    /* Cache breakpoint on the system block only — once SYSTEM_PROMPT
       grows past Haiku 4.5's ~4096-token cache minimum, every request
       reads it back at ~0.1× input cost. Until then it's a silent
       no-op. Don't add a top-level cache_control — that would cache
       the per-URL user message no other request can reuse. */
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

    if (process.env.NODE_ENV !== "production") {
      const u = response.usage;
      console.log(
        `[summarize] lang=${targetLang} cache_read=${u.cache_read_input_tokens ?? 0} ` +
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
    memorableQuote: output.memorableQuote,
    beginnerExplanation: output.beginnerExplanation,
    lang: targetLang,
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
