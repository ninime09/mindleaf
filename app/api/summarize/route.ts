import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type {
  Highlight, Source, SourceType, SummarizeResponse, Summary, Takeaway,
} from "@/lib/api/types";
import { fetchPageText, FetchError } from "@/lib/server/fetch-text";
import { checkAndIncrement, clientIp } from "@/lib/server/rate-limit";
import { readCached, writeCached } from "@/lib/server/response-cache";

export const runtime = "nodejs";

/* ============================================================
   Structured output schema — what Claude must return.
   String min/max are client-side in the SDK; keep lowers for
   sanity and rely on descriptions + the system prompt to steer
   upper bounds. Order of fields here mirrors the UI's section
   order on the Detail page, which reads a bit better for Claude.
   ============================================================ */
/* Note: structured outputs validate bounds CLIENT-SIDE in the SDK —
   Claude doesn't see them. Schema constraints stay permissive (just
   non-empty); the descriptions communicate intent without prescribing
   counts, so a long meaty source can produce a thick summary and a
   short thin one a shorter one. The *structure* is fixed; the *depth*
   follows the source. */
const SummaryOutput = z.object({
  title: z.string().min(1).describe(
    "A short, clean title. Prefer the source's own title if it has one; otherwise rephrase in the same calm voice."
  ),
  tags: z.array(z.string().min(1)).min(1).describe(
    "A handful of lowercase topic tags for grouping in a notebook (e.g. 'attention', 'craft', 'focus'). Not a restatement of the title. Keep it to 5 or fewer."
  ),
  thesis: z.string().min(1).describe(
    "One sentence. The single most important claim, stated plainly. No 'the author argues that…' preamble. Start with the idea."
  ),
  paragraphs: z.array(z.string().min(1)).min(1).describe(
    "Continuous prose paragraphs. Each entry MUST be a multi-sentence paragraph with sentence-ending punctuation. NEVER emit a heading, label, section name, or single-phrase fragment as its own array item — even if the source uses subheadings like 'Sprint' / '冲刺' / 'Planner', weave the structure into the prose itself ('The sprint phase introduces a contract that…'). Use as many paragraphs as the source genuinely needs."
  ),
  takeaways: z.array(z.object({
    title: z.string().min(1).describe("A punchy line the reader could carry with them. A full thought, not a topic label."),
    detail: z.string().min(1).describe("One or two sentences explaining why the takeaway matters or how it's grounded in the source. Enough context to land."),
  })).min(1).describe(
    "Capture every distinct idea worth carrying from this source. Don't artificially trim to hit a number, don't pad to look thorough. A meaty essay may have six takeaways; a narrow piece may have two."
  ),
  memorableQuote: z.string().min(1).describe(
    "One sentence — the single line worth remembering when everything else fades. Lift it from the source if there's a quotable line that captures the piece; otherwise paraphrase the thesis in a more memorable way. No quote marks."
  ),
  beginnerExplanation: z.array(z.string().min(1)).min(1).describe(
    "Short prose paragraphs explaining the idea to someone new using a simple metaphor or everyday scenario. Each entry must be a complete multi-sentence paragraph — never a heading, label, or short phrase on its own. A different angle than the summary — use analogy, not the piece's own structure."
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
- **Cut filler, cover the substance.** Trim sentences that don't earn their place, but don't underfeed the reader.
- **Match the source's depth.** A rich, meaty essay earns a thick summary with many takeaways; a short thin one gets a shorter treatment. Never pad to look thorough; never trim to look concise. Let the source decide.
- Do not repeat yourself across sections. The thesis, takeaway titles, memorable quote, and beginner explanation must each say something the others don't.
- **Every takeaway must be a complete thought.** No fragments, no dangling phrases, no titles that end with 的/了 mid-clause or a hanging preposition. If you can't fit the idea into one full sentence, drop the takeaway entirely.
- **Paragraphs are prose, never structure.** If the source uses subheadings (e.g. "Sprint", "Planner", "冲刺", "评估器"), do NOT echo those subheadings as standalone entries in the \`paragraphs\` or \`beginnerExplanation\` arrays. Each array item must be a full multi-sentence paragraph — write the heading INTO the sentence rather than emitting it on its own line. A 2-character or single-phrase array entry is a bug.
- Never invent facts. If something is implied but not stated, say so plainly.
- Do not start the thesis with "The article", "The author", "This piece", "This essay" or similar throat-clearing. Start with the idea itself.

# Output language
- The user will specify a target language (en or zh) in their message. Write **every field** — title, tags, thesis, paragraphs, takeaway titles and details, memorable quote, beginner explanation — in that language.
- If the target is 中文 and the source is English, translate faithfully into natural, native-feeling Chinese — not word-for-word. If the source is Chinese and the target is English, same in reverse.
- Tags are lowercase. In 中文 they can be natural short phrases (e.g. "注意力", "克制", "写作"); skip English transliteration.

# Boilerplate to strip
- Do not include the URL, byline, publication date, or navigation scaffolding in your prose.
- If the source has repeated nav/footer text interleaved with content, ignore it.
- If the page appears to be a listing/index rather than an article, return a shorter summary explaining that, instead of pretending there's a thesis.

# What "punchy" looks like

Takeaway titles and the thesis carry most of the perceived quality. The difference between a memorable summary and a forgettable one usually lives in these few lines.

Lazy takeaway titles (do not write these):
- "Notifications are important to consider."
- "Calm software is good for users."
- "Design should respect users."
- "Animation can be useful."

Punchy versions of the same ideas:
- "Notifications must earn their interruption."
- "Calm ≠ minimal. Calm is context-aware."
- "Default to showing less; reveal on intent."
- "Motion explains causality — not delight."

The pattern: punchy titles state a position, name the constraint, or invert the obvious framing. Lazy ones re-state the topic. Aim for the first.

# Worked example — English

The source below is a hypothetical 54-minute conference talk by Linzi Berry titled "Designing calm software" (Figma Config '25). Read it for **structure, voice, and the shape of each field** — the *frame* of a Mindleaf summary. Do **not** treat the specific number of paragraphs, takeaways, or explanation paragraphs as a template to copy for unrelated sources; let the real source's depth dictate those counts. And never lift the example's metaphors, tags, or quote into an unrelated summary.

Source preview:
"…software has gotten louder at the exact moment our attention has become most fragile. I want to argue today for what I call calm software — software that respects the state of mind you bring to it… the test for any notification is: would this still be valuable if you discovered it an hour later on your own?… motion in interfaces should be a language for cause and effect, not decoration… the average team chat app's unread badge is the iOS Focus mode's exact opposite — it manufactures urgency for engagement…"

Expected output (target language: English):
{
  "title": "Designing calm software",
  "tags": ["attention", "calm-software", "craft", "interruption"],
  "thesis": "Software has gotten louder at the exact moment our attention is most fragile, and the fix is not minimalism — it is respect for the user's existing state of mind.",
  "paragraphs": [
    "Linzi's argument is less about removing UI than about giving every piece of UI a reason to be visible. Calm software appears when summoned, stays quiet when not, and never invents urgency that doesn't exist. The bar for showing something is whether it would still be useful if the user found it an hour later on their own.",
    "She traces the idea back to Mark Weiser's 1995 essay on calm technology and brings it into 2026: what does calm look like in an age of AI-driven recommendations, infinite feeds, and always-on collaboration? Her answer is mostly about defaults — every on-by-default panel is a designer's claim that their priorities outweigh the user's focus.",
    "The contrast she keeps returning to is iOS Focus modes versus the average team chat's unread badge. Same surface area, opposite stance: one yields to the user's attention, the other manufactures urgency to compete for it."
  ],
  "takeaways": [
    {"title": "Calm ≠ minimal. Calm is context-aware.", "detail": "The goal isn't to remove UI — it's to make UI appear exactly when needed and disappear when it isn't. Stripping things away is a side effect, not the point."},
    {"title": "Notifications must earn their interruption.", "detail": "Each push is a tax on attention. The test: would this still be valuable if the user discovered it an hour later on their own?"},
    {"title": "Motion explains causality — not delight.", "detail": "Animation is a language for cause and effect. Decorative motion is the UI equivalent of talking over someone mid-sentence."},
    {"title": "Default to showing less; reveal on intent.", "detail": "Every on-by-default panel is a statement that the designer's priorities outweigh the user's focus. Make the user reach for what they actually want."}
  ],
  "memorableQuote": "Good tools don't compete for attention. They wait patiently, trusting that the person using them knows when to look up.",
  "beginnerExplanation": [
    "Imagine you have two roommates. One is always tapping your shoulder — did you see this, did you see that, don't forget about the thing. The other sits on the couch, reads quietly, and when you walk in with a question, they put the book down and give you their full attention.",
    "Most software is the first roommate. Calm software is the second. The quiet roommate isn't doing less — they cook, clean, pay rent, have opinions. They just understand that your attention is finite, and interrupting you has a real cost.",
    "In practice this is the difference between iOS's Focus modes and a team chat's unread badge. Both are technically 'features.' One waits for you to want it. The other invents urgency to keep you reaching for it."
  ]
}

What this example demonstrates (structure and voice — NOT a length template):
- The thesis is one sentence carrying the whole argument; no "the speaker discusses…" preamble.
- Each takeaway title is a stance, not a topic ("Notifications must earn their interruption" — not "About notifications").
- The memorable quote is one line you could carry with you all week. It's not a restatement of the thesis.
- The beginner explanation comes at the same idea from a different angle — a concrete two-roommates metaphor — instead of repeating the summary's structure.
- The number of paragraphs and takeaways matches the density of this particular talk. A denser source would earn more; a thinner one, fewer.

# Worked example — 中文 (same source, target language: 中文)

Expected output:
{
  "title": "设计从容的软件",
  "tags": ["注意力", "从容设计", "克制", "通知"],
  "thesis": "软件越来越吵——通知更多、引导更多、人为的紧迫更多——可偏偏就在我们注意力最脆弱的时候。",
  "paragraphs": [
    "Linzi 谈的不是把界面砍掉，而是让每一处界面都有出现的理由。从容的软件在你叫它时才出现，不需要时安静待着，绝不无中生有地制造紧迫感。判断标准是：要是用户一小时后自己发现，这事还值得吗？",
    "她把这个想法一路追到 Mark Weiser 1995 年那篇关于"从容技术"的文章，然后把它拉回当下——在 AI 推荐、无限下拉、随时在线协作的今天，"从容"长什么样？她给的答案大多关乎默认值：每一个默认展开的面板，都在说设计者的优先级比用户的专注更重要。",
    "她反复对比的两个例子是 iOS 专注模式和大多数团队聊天的未读红点。同样的位置、相反的姿态：一个让位给用户的注意力，另一个为了留住人主动制造紧迫。"
  ],
  "takeaways": [
    {"title": "从容 ≠ 极简。从容，是看情境。", "detail": "目的不是把界面砍掉，而是让它该出现时出现、用完就退。"砍"只是结果，不是目的。"},
    {"title": "通知要配得上它对你的打扰。", "detail": "每条推送都在收注意力税。可以问自己：要是用户一小时后自己发现，这事还值得吗？"},
    {"title": "动效讲因果，不是讨好。", "detail": "动画是一种讲"因为 A 所以 B"的语言。纯装饰的动效，等同于一个人在你说话时硬插嘴。"},
    {"title": "默认少露，用户想看时再展开。", "detail": "每个默认展开的面板，都在说设计者的优先级比用户的专注更重要。让用户主动伸手去找，比你主动塞更尊重。"}
  ],
  "memorableQuote": "好工具不会争你的注意力。它们安静等着，相信用它的人知道什么时候该抬头。",
  "beginnerExplanation": [
    "想象你有两个室友。一个总在拍你肩膀——你看到没？那个呢？别忘了那件事啊！另一个坐在沙发上安静地读书；你带着问题走进来时，他会把书合上，认真看着你。",
    "大多数软件就像第一个室友。从容的软件，像第二个。安静的那位并不是做得更少——他照样做饭、打扫、交房租、也有自己的想法。他只是明白：你的注意力是有限的，打断你是要付代价的。",
    "在实际里，这就是 iOS 专注模式和团队聊天未读红点的区别。技术上都叫"功能"。一个在等你想用它，另一个在制造紧迫，让你不停伸手。"
  ]
}

What this Chinese version demonstrates (voice — NOT a length template):
- 中文不是逐字逐句的英文直译，而是地道的、像中文编辑会写的那种。"砍" "塞" "硬插嘴"都是自然口语。
- 标签用自然中文短语（"注意力" "从容设计"），不音译英文术语。
- 整段读起来像中文写作者的原创，不是翻译稿。
- 同样，段落数、要点数跟着源文章的密度走，不要把这里的数量当成模板照搬。`;

/* ============================================================
   POST /api/summarize
   ============================================================ */
const Body = z.object({
  url: z.string().url(),
  type: z.enum(["blog", "podcast", "video"]),
  lang: z.enum(["en", "zh"]).optional(),
});

export async function POST(req: Request) {
  /* Validate body FIRST so we can use it for cache lookup. Rate limit
     after cache check — cache hits are free and shouldn't count. */
  let body: z.infer<typeof Body>;
  try {
    const json = await req.json();
    body = Body.parse(json);
  } catch (err) {
    return jsonError(400, err instanceof z.ZodError ? "Invalid request body." : "Body must be JSON.");
  }
  const targetLang: "en" | "zh" = body.lang ?? "en";
  const cacheInput = { url: body.url, type: body.type, lang: targetLang };
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";

  /* Cache check — short-circuits the entire flow on hit. */
  if (!fresh) {
    const cached = await readCached(cacheInput);
    if (cached) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[summarize] cache hit url=${body.url} lang=${targetLang}`);
      }
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-Mindleaf-Cache": "HIT" },
      });
    }
  }

  /* Rate limit + daily budget — only cache misses count. */
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
    /* max_tokens — Anthropic-recommended non-streaming default is ~16K
       (keeps responses under SDK HTTP timeouts). Earlier value of 4000
       was tripping mid-output truncation on long Chinese articles where
       Sonnet's takeaway + explanation fields ran past the budget,
       leaving the thesis field cut mid-sentence in the final JSON. */
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(SummaryOutput) },
    });

    if (!response.parsed_output) {
      return jsonError(502, "Model returned an unparseable response.");
    }
    output = response.parsed_output;

    /* If Claude still hits the cap, the JSON parse may succeed but a
       string field can be truncated mid-sentence. Surface that loudly
       so we can bump the budget rather than silently shipping a broken
       summary. */
    if (response.stop_reason === "max_tokens") {
      console.warn("[summarize] hit max_tokens cap — output may be truncated. Consider raising max_tokens further.");
    }

    if (process.env.NODE_ENV !== "production") {
      const u = response.usage;
      console.log(
        `[summarize] lang=${targetLang} stop=${response.stop_reason} ` +
        `cache_read=${u.cache_read_input_tokens ?? 0} ` +
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
    paragraphs: cleanProseArray(output.paragraphs),
    memorableQuote: output.memorableQuote,
    beginnerExplanation: cleanProseArray(output.beginnerExplanation),
    lang: targetLang,
  };
  const takeaways: Takeaway[] = output.takeaways.map((t, i) => ({
    id: `tk-${id}-${i + 1}`,
    title: t.title,
    detail: t.detail,
  }));
  const highlights: Highlight[] = [];

  const payload: SummarizeResponse = { source, summary, takeaways, highlights };

  /* Persist to disk cache — subsequent identical requests skip Claude. */
  await writeCached(cacheInput, payload);

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Mindleaf-Cache": "MISS" },
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

/* Defensive cleanup for `paragraphs` / `beginnerExplanation` arrays.
   When Claude summarizes a structured article, it sometimes emits the
   source's section headings ("冲刺", "Planner", "完成") as their own
   array items, and starts the next entry with a mid-sentence comma —
   the rendered UI then breaks each into its own <p>. Two passes:

     1. If an entry starts with mid-sentence punctuation, merge it
        into the previous entry (it's clearly a continuation).
     2. Drop entries shorter than 20 characters that are obviously
        heading-like (no real prose is that short).
*/
function cleanProseArray(arr: string[]): string[] {
  const CONT = /^[，、,；;：:。.！!？?]/;
  const out: string[] = [];
  for (const raw of arr) {
    const s = (raw ?? "").trim();
    if (!s) continue;
    if (out.length > 0 && CONT.test(s)) {
      out[out.length - 1] = (out[out.length - 1] + s).replace(/\s+/g, " ").trim();
      continue;
    }
    if (s.length < 20) continue;
    out.push(s);
  }
  return out;
}

function pickHue(type: SourceType): number {
  switch (type) {
    case "video":   return 235;
    case "podcast": return 290;
    case "blog":    return 85;
  }
}
