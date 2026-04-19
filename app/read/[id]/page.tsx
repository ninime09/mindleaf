"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon } from "@/components/icons";
import { LangSwitch, Orb, Progress, Tag } from "@/components/primitives";
import {
  addHighlight, deleteHighlight, getHighlights, getNote, getSource,
  getSummary, getTakeaways, listSources, setNoteTags,
  toggleBookmark, updateHighlightAnnotation,
  type Highlight, type Note, type Source, type Summary, type Takeaway,
} from "@/lib/api";
import { Highlightable } from "@/components/highlightable";
import { NoteTagEditor } from "@/components/note-tag-editor";
import { useToast } from "@/components/toast";
import { savedLabel, useNotes } from "@/lib/hooks/use-notes";

/* Shared bookmark/share wiring for both CanonicalDetail and DynamicDetail. */
function useBookmarkAndShare(id: string) {
  const { t } = useLang();
  const { push } = useToast();
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);

  useEffect(() => {
    getSource(id).then(s => setBookmarked(s?.bookmarked ?? false));
  }, [id]);

  const onBookmark = async () => {
    const next = await toggleBookmark(id);
    if (next == null) return;
    setBookmarked(next);
    push(t(next ? "toast.bookmarked" : "toast.unbookmarked"), { icon: "bookmark" });
  };

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      push(t("toast.linkCopied"), { icon: "link" });
    } catch {
      push(t("toast.linkCopied"), { kind: "error", icon: "link" });
    }
  };

  return { bookmarked, onBookmark, onShare };
}

type SectionId = "summary" | "takeaways" | "remember" | "explain" | "notes";

const CANONICAL_ID = "designing-calm-software";

export default function Detail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? CANONICAL_ID;
  if (id === CANONICAL_ID) return <CanonicalDetail id={id}/>;
  return <DynamicDetail id={id}/>;
}

function CanonicalDetail({ id }: { id: string }) {
  const router = useRouter();
  const { t, lang } = useLang();
  const { notes, setNotes, savedAt } = useNotes(id, t("det.notes.body"));
  const [activeSection, setActiveSection] = useState<SectionId>("summary");
  const { bookmarked, onBookmark, onShare } = useBookmarkAndShare(id);

  const sections: { id: SectionId; label: string }[] = [
    { id: "summary",   label: t("det.sec.summary") },
    { id: "takeaways", label: t("det.sec.take") },
    { id: "remember",  label: t("det.sec.rem") },
    { id: "explain",   label: t("det.sec.explain") },
    { id: "notes",     label: t("det.sec.notes") },
  ];

  useEffect(() => {
    const handler = () => {
      for (const s of sections) {
        const el = document.getElementById(`sec-${s.id}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < 200 && r.bottom > 200) {
          setActiveSection(s.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, padding: "16px 24px 0" }}>
        <div className="glass-strong" style={{
          maxWidth: 1400, margin: "0 auto",
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 12,
          borderRadius: 16,
        }}>
          <button onClick={() => router.push("/workspace")} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12.5 }}>
            <Icon name="chevron" size={13} style={{ transform: "rotate(180deg)" }}/> {t("det.back")}
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(23,42,82,0.1)" }}/>
          <div style={{ fontSize: 12.5, color: "var(--ink-500)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="folder" size={12}/>
            {t("det.crumb.col")}
            <span style={{ margin: "0 4px", color: "var(--ink-300)" }}>/</span>
            <span style={{ color: "var(--ink-900)", fontWeight: 500 }}>{t("det.crumb.t")}</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <LangSwitch compact/>
            <button
              className="btn btn-ghost btn-icon"
              onClick={onBookmark}
              aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
              style={bookmarked ? { color: "var(--accent-deep)" } : undefined}
            >
              <Icon name="bookmark" size={14} style={{ fill: bookmarked ? "currentColor" : "none" }}/>
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onShare} aria-label="Copy link">
              <Icon name="share" size={14}/>
            </button>
            <button className="btn btn-ghost btn-icon"><Icon name="more" size={14}/></button>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "24px 24px 120px",
        display: "grid",
        gridTemplateColumns: "200px 1fr 320px",
        gap: 32,
      }}>
        {/* LEFT */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "start" }}>
          <div className="eyebrow" style={{ marginBottom: 12, padding: "0 8px" }}>{t("det.onThisPage")}</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sections.map(s => {
              const active = s.id === activeSection;
              return (
                <a key={s.id} href={`#sec-${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    padding: "7px 12px",
                    fontSize: 12.5,
                    color: active ? "var(--ink-900)" : "var(--ink-500)",
                    fontWeight: active ? 550 : 450,
                    borderLeft: active ? "1.5px solid var(--accent-deep)" : "1.5px solid rgba(23,42,82,0.08)",
                    textDecoration: "none",
                    transition: "all 200ms var(--ease)",
                    letterSpacing: "-0.005em",
                  }}>
                  {s.label}
                </a>
              );
            })}
          </nav>

          <div className="glass" style={{ marginTop: 24, padding: 16, borderRadius: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t("det.readtime")}</div>
            <div className="display" style={{ fontSize: 26, letterSpacing: "-0.02em", margin: 0 }}>{t("det.readtime.n")}</div>
            <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 4 }}>{t("det.readtime.of")}</div>
          </div>
        </aside>

        {/* CENTER */}
        <article style={{ maxWidth: 720 }}>
          <div className="reveal">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <Tag color="blue">{t("det.meta.video")}</Tag>
              <Tag color="sage">{t("det.meta.dc")}</Tag>
              <span style={{ fontSize: 11.5, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>
                {t("det.meta.date")}
              </span>
            </div>

            <h1 className="display" style={{
              fontSize: 68, margin: "0 0 20px",
              letterSpacing: "-0.025em", lineHeight: 1,
              wordBreak: "keep-all", overflowWrap: "break-word",
            }}>
              {t("det.title.a")}
              {lang === "zh" ? "" : " "}
              <em style={{ fontStyle: "italic", color: "var(--accent-deep)", whiteSpace: "nowrap" }}>{t("det.title.em")}</em>
              {lang === "zh" ? "" : " "}
              {t("det.title.b")}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, oklch(0.75 0.07 30), oklch(0.55 0.09 35))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 13, fontWeight: 600,
              }}>LB</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 550 }}>Linzi Berry</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{t("det.author.sub")}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <a href="#" className="chip" style={{ textDecoration: "none" }}>
                  <Icon name="link" size={11}/> {t("det.chip.source")}
                </a>
                <a href="#" className="chip" style={{ textDecoration: "none" }}>
                  <Icon name="play" size={11}/> {t("det.chip.watch")}
                </a>
              </div>
            </div>

            <div style={{
              position: "relative", height: 280,
              borderRadius: 18, overflow: "hidden",
              border: "0.5px solid rgba(23,42,82,0.08)",
              background: `
                radial-gradient(600px 300px at 30% 40%, oklch(0.88 0.06 235 / 0.8), transparent 60%),
                radial-gradient(400px 300px at 80% 70%, oklch(0.90 0.05 210 / 0.7), transparent 60%),
                linear-gradient(180deg, oklch(0.94 0.03 235), oklch(0.90 0.04 230))
              `,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 40,
            }}>
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.3) 0 1px, transparent 1px 22px)",
              }}/>
              <div style={{
                position: "relative",
                background: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.7)",
                padding: "18px 22px", borderRadius: 16,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "oklch(0.42 0.10 248)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white",
                }}><Icon name="play" size={16}/></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 550 }}>{t("det.crumb.t")}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-500)" }}>Linzi Berry · 54:12</div>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <section id="sec-summary" style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.summary")}</div>
            <h2 className="display" style={{ fontSize: 34, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
              {t("det.sum.h")}
            </h2>
            <div style={{ fontSize: 17, lineHeight: 1.7, color: "var(--ink-700)", fontFamily: "var(--font-display)", letterSpacing: "-0.005em" }}>
              <p style={{ marginTop: 0 }}>{t("det.sum.p1")}</p>
              <p>
                {t("det.sum.p2.a")} <span style={{ background: "oklch(0.93 0.06 85 / 0.55)", padding: "2px 5px", borderRadius: 3 }}>{t("det.sum.p2.hl")}</span> {t("det.sum.p2.b")}
              </p>
              <p>{t("det.sum.p3")}</p>
            </div>
          </section>

          {/* KEY TAKEAWAYS */}
          <section id="sec-takeaways" style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.take")}</div>
            <h2 className="display" style={{ fontSize: 34, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              {t("det.take.h")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { n: "01", ti: t("det.take.1.t"), d: t("det.take.1.d") },
                { n: "02", ti: t("det.take.2.t"), d: t("det.take.2.d") },
                { n: "03", ti: t("det.take.3.t"), d: t("det.take.3.d") },
                { n: "04", ti: t("det.take.4.t"), d: t("det.take.4.d") },
              ].map(tk => (
                <div key={tk.n} className="glass" style={{ padding: 22, borderRadius: 16, display: "flex", gap: 18 }}>
                  <div className="display" style={{
                    fontSize: 32, color: "var(--accent-deep)",
                    letterSpacing: "-0.02em", flexShrink: 0,
                    width: 46,
                  }}>{tk.n}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 550, marginBottom: 6, letterSpacing: "-0.01em" }}>{tk.ti}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-500)" }}>{tk.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* REMEMBER */}
          <section id="sec-remember" style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.rem")}</div>
            <h2 className="display" style={{ fontSize: 34, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              {t("det.rem.h")}
            </h2>
            <div className="glass-strong" style={{
              padding: "40px 44px",
              borderRadius: 22,
              background: "linear-gradient(180deg, rgba(255,255,255,0.7), oklch(0.95 0.03 235 / 0.4))",
              position: "relative", overflow: "hidden",
            }}>
              <Orb size={300} color="oklch(0.85 0.07 235)" style={{ top: -120, right: -80 }}/>
              <div style={{ position: "relative" }}>
                <Icon name="quote" size={22} style={{ color: "var(--accent)", marginBottom: 14 }}/>
                <blockquote className="display" style={{
                  margin: 0, fontSize: 30, lineHeight: 1.25,
                  color: "var(--ink-900)", letterSpacing: "-0.015em",
                  fontStyle: "italic", maxWidth: 580,
                }}>
                  {t("det.rem.q")}
                </blockquote>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {t("det.rem.next")}
                  </div>
                  <div style={{ flex: 1, maxWidth: 120 }}>
                    <Progress value={0.3}/>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* EXPLAIN */}
          <section id="sec-explain" style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.explain")}</div>
            <h2 className="display" style={{ fontSize: 34, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
              {t("det.ex.h")}
            </h2>
            <div style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ink-700)" }}>
              <p style={{ marginTop: 0 }}>{t("det.ex.p1")}</p>
              <p>
                {t("det.ex.p2.a")} <em>{t("det.ex.p2.em")}</em> {t("det.ex.p2.b")}
              </p>
              <p>{t("det.ex.p3")}</p>
              <div style={{
                margin: "28px 0",
                padding: "16px 20px",
                borderLeft: "2px solid var(--accent)",
                background: "oklch(0.95 0.03 235 / 0.5)",
                borderRadius: "0 10px 10px 0",
                fontSize: 14, fontStyle: "italic",
              }}>
                <strong style={{ fontStyle: "normal", fontWeight: 550, display: "block", marginBottom: 4, color: "var(--ink-900)" }}>{t("det.ex.callout.t")}</strong>
                {t("det.ex.callout.b")}
              </div>
              <p>{t("det.ex.p4")}</p>
            </div>
          </section>

          {/* NOTES */}
          <section id="sec-notes" style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="eyebrow">{t("det.notes.eyebrow")}</div>
              <span style={{ fontSize: 11, color: "var(--ink-400)" }}>{savedLabel(savedAt, lang, t("det.notes.saved"))}</span>
            </div>
            <h2 className="display" style={{ fontSize: 34, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
              {t("det.notes.h")}
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: "100%", minHeight: 200,
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.7)",
                boxShadow: "0 0 0 0.5px rgba(23,42,82,0.06)",
                borderRadius: 16,
                padding: 20,
                fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.7,
                color: "var(--ink-900)", resize: "vertical", outline: "none",
                letterSpacing: "-0.005em",
              }}
            />
            <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-500)", marginRight: 4 }}>{t("det.notes.addTag")}</span>
              <Tag color="blue">attention</Tag>
              <Tag color="sand">craft</Tag>
              <Tag color="violet">product</Tag>
              <Tag>+</Tag>
            </div>
          </section>

          {/* footer nav */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 60 }}>
            <a href="#" className="glass" style={{
              padding: 18, borderRadius: 14,
              textDecoration: "none", color: "inherit",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{t("det.prev")}</div>
              <div style={{ fontSize: 14, fontWeight: 550 }}>{t("det.prev.t")}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{t("det.prev.s")}</div>
            </a>
            <a href="#" className="glass" style={{
              padding: 18, borderRadius: 14,
              textDecoration: "none", color: "inherit",
              display: "flex", flexDirection: "column", gap: 4, textAlign: "right",
            }}>
              <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{t("det.next")}</div>
              <div style={{ fontSize: 14, fontWeight: 550 }}>{t("det.next.t")}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{t("det.next.s")}</div>
            </a>
          </div>
        </article>

        {/* RIGHT */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "start", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="eyebrow">{t("det.hls")}</span>
              <span style={{ fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>5</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { c: 85,  tx: t("det.hl.1"), ts: "04:12" },
                { c: 235, tx: t("det.hl.2"), ts: "08:47" },
                { c: 170, tx: t("det.hl.3"), ts: "12:03" },
                { c: 290, tx: t("det.hl.4"), ts: "19:40" },
              ].map((h, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: `oklch(0.96 0.03 ${h.c} / 0.55)`,
                  borderLeft: `2px solid oklch(0.68 0.10 ${h.c})`,
                  fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-700)",
                }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-400)", marginBottom: 3 }}>
                    @ {h.ts}
                  </div>
                  &ldquo;{h.tx}&rdquo;
                </div>
              ))}
            </div>
          </div>

          <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t("det.connected")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { tx: t("dash.right.conn.1"), sub: t("dash.mode.blog"), hue: 170 },
                { tx: t("dash.right.conn.2"), sub: t("dash.mode.pod"),  hue: 290 },
                { tx: t("dash.right.conn.3"), sub: t("dash.mode.vid"),  hue: 235 },
              ].map(n => (
                <a key={n.tx} href="#" style={{
                  padding: "8px 10px", borderRadius: 8,
                  textDecoration: "none", color: "var(--ink-700)",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "all 200ms var(--ease)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: `oklch(0.95 0.03 ${n.hue})`,
                    flexShrink: 0,
                  }}/>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }} className="truncate">{n.tx}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-400)" }}>{n.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t("det.meta.h")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              {[
                [t("det.meta.source"),  "Figma Config '25"],
                [t("det.meta.dur"),     "54:12"],
                [t("det.meta.added"),   t("det.meta.added.v")],
                [t("det.meta.revs"),    t("det.meta.revs.v")],
                [t("det.meta.coll"),    t("det.meta.dc")],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "var(--ink-400)" }}>{k}</span>
                  <span style={{ color: "var(--ink-700)", fontWeight: 500, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   DynamicDetail — for any source ID other than the canonical demo.
   Pulls source/summary/takeaways/highlights from the mock API and
   renders a slimmer editorial layout. Notes wired through the same hook.
   ============================================================ */
function DynamicDetail({ id }: { id: string }) {
  const router = useRouter();
  const { t, lang } = useLang();
  const [source, setSource] = useState<Source | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [takeaways, setTakeaways] = useState<Takeaway[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [siblings, setSiblings] = useState<Source[]>([]);
  const [noteTags, setNoteTagsState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("summary");
  const { notes, setNotes, savedAt } = useNotes(id, "");
  const { bookmarked, onBookmark, onShare } = useBookmarkAndShare(id);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getSource(id), getSummary(id), getTakeaways(id), getHighlights(id),
      listSources(), getNote(id),
    ]).then(([s, sum, tk, hl, all, note]) => {
      if (cancelled) return;
      if (!s) { setNotFound(true); setLoading(false); return; }
      setSource(s);
      setSummary(sum);
      setTakeaways(tk);
      setHighlights(hl);
      setSiblings(all);
      setNoteTagsState(note?.tags ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  /* Highlight CRUD — wired through to the right-sidebar list. Optimistic
     local state; mock API persists to localStorage. */
  const addHl = async (blockId: string, text: string) => {
    const h = await addHighlight({ sourceId: id, blockId, text });
    setHighlights(prev => [...prev, h]);
  };
  const updateHl = async (hlId: string, annotation: string) => {
    const h = await updateHighlightAnnotation(id, hlId, annotation);
    if (h) setHighlights(prev => prev.map(x => x.id === hlId ? h : x));
  };
  const removeHl = async (hlId: string) => {
    const ok = await deleteHighlight(id, hlId);
    if (ok) setHighlights(prev => prev.filter(x => x.id !== hlId));
  };

  /* Helper: highlights filtered to a single block. */
  const blockHls = (blockId: string) => highlights.filter(h => h.blockId === blockId);

  /* Tag editing — fire-and-forget persistence; UI updates optimistically. */
  const addNoteTag = async (tag: string) => {
    const clean = tag.trim();
    if (!clean || noteTags.includes(clean)) return;
    const next = [...noteTags, clean];
    setNoteTagsState(next);
    const saved: Note = await setNoteTags(id, next);
    setNoteTagsState(saved.tags);
  };
  const removeNoteTag = async (tag: string) => {
    const next = noteTags.filter(t => t !== tag);
    setNoteTagsState(next);
    const saved: Note = await setNoteTags(id, next);
    setNoteTagsState(saved.tags);
  };

  /* Scroll spy — same approach as CanonicalDetail. */
  useEffect(() => {
    if (loading || notFound) return;
    const ids: SectionId[] = ["summary", "takeaways", "remember", "explain", "notes"];
    const handler = () => {
      for (const sid of ids) {
        const el = document.getElementById(`sec-${sid}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < 200 && r.bottom > 200) {
          setActiveSection(sid);
          break;
        }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [loading, notFound]);

  if (loading) {
    return (
      <div style={{
        position: "relative", zIndex: 2, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
      }}>
        <div className="ml-spinner" style={{ width: 28, height: 28, borderColor: "rgba(23,42,82,0.2)", borderTopColor: "var(--accent-deep)" } as React.CSSProperties}/>
        <div style={{ fontSize: 13, color: "var(--ink-500)" }}>
          {lang === "zh" ? "加载中…" : "Loading…"}
        </div>
      </div>
    );
  }

  if (notFound || !source) {
    return (
      <div style={{
        position: "relative", zIndex: 2, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 14, padding: 24, textAlign: "center",
      }}>
        <h1 className="display" style={{ fontSize: 36, margin: 0, letterSpacing: "-0.02em" }}>
          {lang === "zh" ? "找不到这份内容" : "Source not found"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-500)", maxWidth: 420, margin: 0 }}>
          {lang === "zh"
            ? "这份内容可能已被移除，或者你打开了一个旧链接。"
            : "This source may have been removed, or you followed a stale link."}
        </p>
        <button onClick={() => router.push("/")} className="btn btn-primary pressable" style={{ padding: "9px 16px", fontSize: 13 }}>
          {lang === "zh" ? "回到首页" : "Back to home"} <Icon name="arrow" size={13}/>
        </button>
      </div>
    );
  }

  const sections: { id: SectionId; label: string; show: boolean }[] = [
    { id: "summary",   label: t("det.sec.summary"), show: !!summary },
    { id: "takeaways", label: t("det.sec.take"),    show: takeaways.length > 0 },
    { id: "remember",  label: t("det.sec.rem"),     show: !!summary?.memorableQuote },
    { id: "explain",   label: t("det.sec.explain"), show: !!(summary?.beginnerExplanation && summary.beginnerExplanation.length) },
    { id: "notes",     label: t("det.sec.notes"),   show: true },
  ];

  const readMin = estimateReadMinutes(summary, takeaways);
  const typeColor: "blue" | "violet" | "sage" =
    source.type === "video" ? "blue" : source.type === "podcast" ? "violet" : "sage";
  const typeLabel = source.type === "video"
    ? t("det.meta.video")
    : source.type === "podcast"
      ? t("dash.mode.pod")
      : t("dash.mode.blog");
  const heroSpread = source.type === "video"
    ? "radial-gradient(600px 300px at 30% 40%, oklch(0.88 0.06 235 / 0.8), transparent 60%), radial-gradient(400px 300px at 80% 70%, oklch(0.90 0.05 210 / 0.7), transparent 60%), linear-gradient(180deg, oklch(0.94 0.03 235), oklch(0.90 0.04 230))"
    : source.type === "podcast"
      ? "radial-gradient(600px 300px at 30% 40%, oklch(0.90 0.05 290 / 0.8), transparent 60%), radial-gradient(400px 300px at 80% 70%, oklch(0.92 0.04 270 / 0.7), transparent 60%), linear-gradient(180deg, oklch(0.95 0.03 290), oklch(0.92 0.04 285))"
      : "radial-gradient(600px 300px at 30% 40%, oklch(0.94 0.05 85 / 0.8), transparent 60%), radial-gradient(400px 300px at 80% 70%, oklch(0.95 0.04 70 / 0.7), transparent 60%), linear-gradient(180deg, oklch(0.96 0.03 85), oklch(0.94 0.04 80))";

  return (
    <div style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, padding: "16px 24px 0" }}>
        <div className="glass-strong" style={{
          maxWidth: 1400, margin: "0 auto",
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 12,
          borderRadius: 16,
        }}>
          <button onClick={() => router.push("/")} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12.5 }}>
            <Icon name="chevron" size={13} style={{ transform: "rotate(180deg)" }}/> {lang === "zh" ? "首页" : "Home"}
          </button>
          <button onClick={() => router.push("/notebook")} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12.5 }}>
            <Icon name="notebook" size={13}/> {t("nav.notebook")}
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(23,42,82,0.1)" }}/>
          <div style={{ fontSize: 12.5, color: "var(--ink-500)", display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <Icon name={source.type} size={12}/>
            <span className="truncate" style={{ color: "var(--ink-900)", fontWeight: 500 }}>{source.title}</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <LangSwitch compact/>
            <button
              className="btn btn-ghost btn-icon"
              onClick={onBookmark}
              aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
              style={bookmarked ? { color: "var(--accent-deep)" } : undefined}
            >
              <Icon name="bookmark" size={14} style={{ fill: bookmarked ? "currentColor" : "none" }}/>
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onShare} aria-label="Copy link">
              <Icon name="share" size={14}/>
            </button>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "24px 24px 120px",
        display: "grid",
        gridTemplateColumns: "200px 1fr 320px",
        gap: 32,
      }}>
        {/* LEFT — section nav + read time */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "start" }}>
          <div className="eyebrow" style={{ marginBottom: 12, padding: "0 8px" }}>{t("det.onThisPage")}</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sections.filter(s => s.show).map(s => {
              const active = s.id === activeSection;
              return (
                <a key={s.id} href={`#sec-${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    padding: "7px 12px",
                    fontSize: 12.5,
                    color: active ? "var(--ink-900)" : "var(--ink-500)",
                    fontWeight: active ? 550 : 450,
                    borderLeft: active ? "1.5px solid var(--accent-deep)" : "1.5px solid rgba(23,42,82,0.08)",
                    textDecoration: "none",
                    transition: "all 200ms var(--ease)",
                    letterSpacing: "-0.005em",
                  }}>
                  {s.label}
                </a>
              );
            })}
          </nav>

          <div className="glass" style={{ marginTop: 24, padding: 16, borderRadius: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t("det.readtime")}</div>
            <div className="display" style={{ fontSize: 26, letterSpacing: "-0.02em", margin: 0 }}>
              {lang === "zh" ? `${readMin} 分钟` : `${readMin} min`}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 4 }}>
              {lang === "zh" ? "约略估算" : "approximate"}
            </div>
          </div>
        </aside>

        {/* CENTER — article */}
        <article style={{ maxWidth: 720 }}>
          {/* Header */}
          <div className="reveal">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <Tag color={typeColor}>{typeLabel}</Tag>
              <span style={{ fontSize: 11.5, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>
                {new Date(source.addedAt).toLocaleDateString(
                  lang === "zh" ? "zh-CN" : "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </span>
            </div>

            <h1 className="display" style={{
              fontSize: "clamp(40px, 5vw, 60px)", margin: "0 0 20px",
              letterSpacing: "-0.025em", lineHeight: 1.05,
              wordBreak: "keep-all", overflowWrap: "break-word",
            }}>
              {source.title}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13.5, color: "var(--ink-700)" }}>{source.author}</div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <a href={source.url} target="_blank" rel="noreferrer" className="chip" style={{ textDecoration: "none" }}>
                  <Icon name="link" size={11}/> {t("det.chip.source")}
                </a>
              </div>
            </div>

            {/* Hero placeholder — calm gradient with the source title floating on glass */}
            <div style={{
              position: "relative", height: 220,
              borderRadius: 18, overflow: "hidden",
              border: "0.5px solid rgba(23,42,82,0.08)",
              background: heroSpread,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 40,
            }}>
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.3) 0 1px, transparent 1px 22px)",
              }}/>
              <div style={{
                position: "relative",
                background: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.7)",
                padding: "16px 20px", borderRadius: 14,
                display: "flex", alignItems: "center", gap: 12,
                maxWidth: "80%",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "oklch(0.42 0.10 248)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", flexShrink: 0,
                }}><Icon name={source.type} size={15}/></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 550 }} className="truncate">{source.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{source.author}</div>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          {summary && (
            <section id="sec-summary" style={{ marginBottom: 56 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.summary")}</div>
              <h2 className="display" style={{ fontSize: 32, margin: "0 0 20px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                {summary.thesis}
              </h2>
              <div style={{ fontSize: 17, lineHeight: 1.7, color: "var(--ink-700)", fontFamily: "var(--font-display)", letterSpacing: "-0.005em" }}>
                {summary.paragraphs.map((p, i) => (
                  <Highlightable
                    key={i}
                    blockId={`summary-p-${i}`}
                    text={p}
                    highlights={blockHls(`summary-p-${i}`)}
                    onAdd={(t) => addHl(`summary-p-${i}`, t)}
                    onUpdate={updateHl}
                    onDelete={removeHl}
                    style={i === 0 ? { marginTop: 0 } : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* TAKEAWAYS */}
          {takeaways.length > 0 && (
            <section id="sec-takeaways" style={{ marginBottom: 56 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.take")}</div>
              <h2 className="display" style={{ fontSize: 32, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
                {takeawayHeading(takeaways.length, lang)}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {takeaways.map((tk, i) => (
                  <div key={tk.id} className="glass" style={{ padding: 22, borderRadius: 16, display: "flex", gap: 18 }}>
                    <div className="display" style={{
                      fontSize: 30, color: "var(--accent-deep)",
                      letterSpacing: "-0.02em", flexShrink: 0, width: 44,
                    }}>{String(i + 1).padStart(2, "0")}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 550, marginBottom: 6, letterSpacing: "-0.01em" }}>{tk.title}</div>
                      <Highlightable
                        as="div"
                        blockId={`takeaway-${tk.id}-detail`}
                        text={tk.detail}
                        highlights={blockHls(`takeaway-${tk.id}-detail`)}
                        onAdd={(t) => addHl(`takeaway-${tk.id}-detail`, t)}
                        onUpdate={updateHl}
                        onDelete={removeHl}
                        style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-500)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* REMEMBER */}
          {summary?.memorableQuote && (
            <section id="sec-remember" style={{ marginBottom: 56 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.rem")}</div>
              <h2 className="display" style={{ fontSize: 32, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
                {t("det.rem.h")}
              </h2>
              <div className="glass-strong" style={{
                padding: "36px 40px",
                borderRadius: 22,
                background: "linear-gradient(180deg, rgba(255,255,255,0.7), oklch(0.95 0.03 235 / 0.4))",
                position: "relative", overflow: "hidden",
              }}>
                <Orb size={300} color="oklch(0.85 0.07 235)" style={{ top: -120, right: -80 }}/>
                <div style={{ position: "relative" }}>
                  <Icon name="quote" size={20} style={{ color: "var(--accent)", marginBottom: 12 }}/>
                  <blockquote className="display" style={{
                    margin: 0, fontSize: 26, lineHeight: 1.3,
                    color: "var(--ink-900)", letterSpacing: "-0.015em",
                    fontStyle: "italic", maxWidth: 580,
                  }}>
                    {summary.memorableQuote}
                  </blockquote>
                </div>
              </div>
            </section>
          )}

          {/* EXPLAIN */}
          {summary?.beginnerExplanation && summary.beginnerExplanation.length > 0 && (
            <section id="sec-explain" style={{ marginBottom: 56 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{t("det.sec.explain")}</div>
              <h2 className="display" style={{ fontSize: 32, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
                {t("det.ex.h")}
              </h2>
              <div style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ink-700)" }}>
                {summary.beginnerExplanation.map((p, i) => (
                  <Highlightable
                    key={i}
                    blockId={`explain-p-${i}`}
                    text={p}
                    highlights={blockHls(`explain-p-${i}`)}
                    onAdd={(t) => addHl(`explain-p-${i}`, t)}
                    onUpdate={updateHl}
                    onDelete={removeHl}
                    style={i === 0 ? { marginTop: 0 } : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* NOTES */}
          <section id="sec-notes" style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="eyebrow">{t("det.notes.eyebrow")}</div>
              <span style={{ fontSize: 11, color: "var(--ink-400)" }}>{savedLabel(savedAt, lang, t("det.notes.saved"))}</span>
            </div>
            <h2 className="display" style={{ fontSize: 32, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
              {t("det.notes.h")}
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={lang === "zh" ? "在这里写下你的想法……" : "Write what this means for you…"}
              style={{
                width: "100%", minHeight: 200,
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.7)",
                boxShadow: "0 0 0 0.5px rgba(23,42,82,0.06)",
                borderRadius: 16,
                padding: 20,
                fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.7,
                color: "var(--ink-900)", resize: "vertical", outline: "none",
                letterSpacing: "-0.005em",
              }}
            />
            <NoteTagEditor
              tags={noteTags}
              onAdd={addNoteTag}
              onRemove={removeNoteTag}
              addLabel={t("det.tag.add")}
              placeholder={t("det.tag.placeholder")}
              promptLabel={t("det.notes.addTag")}
              style={{ marginTop: 12 }}
            />
          </section>

          {/* PREV / NEXT */}
          {(() => {
            const sorted = [...siblings].sort((a, b) => a.addedAt < b.addedAt ? 1 : -1);
            const idx = sorted.findIndex(s => s.id === id);
            const prev = idx > 0 ? sorted[idx - 1] : null;
            const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
            if (!prev && !next) return null;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 60 }}>
                {prev ? (
                  <a href={`/read/${prev.id}`} className="glass" style={{
                    padding: 18, borderRadius: 14,
                    textDecoration: "none", color: "inherit",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{t("det.prev")}</div>
                    <div style={{ fontSize: 14, fontWeight: 550 }} className="truncate">{prev.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-500)" }} className="truncate">{prev.author}</div>
                  </a>
                ) : <div/>}
                {next ? (
                  <a href={`/read/${next.id}`} className="glass" style={{
                    padding: 18, borderRadius: 14,
                    textDecoration: "none", color: "inherit",
                    display: "flex", flexDirection: "column", gap: 4, textAlign: "right",
                  }}>
                    <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{t("det.next")}</div>
                    <div style={{ fontSize: 14, fontWeight: 550 }} className="truncate">{next.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-500)" }} className="truncate">{next.author}</div>
                  </a>
                ) : <div/>}
              </div>
            );
          })()}
        </article>

        {/* RIGHT — highlights + connected + metadata */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "start", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="eyebrow">{t("det.hls")}</span>
              <span style={{ fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>{highlights.length}</span>
            </div>
            {highlights.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {highlights.map(h => (
                  <div key={h.id} style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: `oklch(0.96 0.03 ${h.hue} / 0.55)`,
                    borderLeft: `2px solid oklch(0.68 0.10 ${h.hue})`,
                    fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-700)",
                  }}>
                    {h.timestamp && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-400)", marginBottom: 3 }}>
                        @ {h.timestamp}
                      </div>
                    )}
                    &ldquo;{h.text}&rdquo;
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.55 }}>
                {t("det.hls.empty")}
              </div>
            )}
          </div>

          {/* Connected — other sources in your notebook */}
          {(() => {
            const others = siblings
              .filter(s => s.id !== id)
              .sort((a, b) => a.addedAt < b.addedAt ? 1 : -1)
              .slice(0, 3);
            return (
              <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>{t("det.connected")}</div>
                {others.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {others.map(n => (
                      <a key={n.id} href={`/read/${n.id}`} style={{
                        padding: "8px 10px", borderRadius: 8,
                        textDecoration: "none", color: "var(--ink-700)",
                        display: "flex", alignItems: "center", gap: 10,
                        transition: "all 200ms var(--ease)",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 5,
                          background: `oklch(0.95 0.03 ${n.hue})`,
                          flexShrink: 0,
                        }}/>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }} className="truncate">{n.title}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ink-400)" }}>{n.author}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.55 }}>
                    {t("det.connected.empty")}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="glass" style={{ padding: 18, borderRadius: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t("det.meta.h")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              <MetaRow label={t("det.meta.source")} value={prettyHost(source.url)}/>
              <MetaRow label={t("det.meta.added")} value={new Date(source.addedAt).toLocaleDateString(
                lang === "zh" ? "zh-CN" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              )}/>
              {source.durationSec && (
                <MetaRow label={t("det.meta.dur")} value={formatDuration(source.durationSec)}/>
              )}
              {source.tags.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "var(--ink-400)" }}>{lang === "zh" ? "标签" : "Tags"}</span>
                  <span style={{
                    color: "var(--ink-700)", textAlign: "right",
                    display: "inline-flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end",
                  }}>
                    {source.tags.map(tg => (
                      <span key={tg} style={{
                        fontSize: 10.5, color: "var(--ink-500)",
                        padding: "2px 7px", background: "rgba(23,42,82,0.05)",
                        borderRadius: 999,
                      }}>#{tg}</span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "var(--ink-400)" }}>{label}</span>
      <span style={{ color: "var(--ink-700)", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function prettyHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* Build the takeaways section heading from the actual count, in the
   user's language. Singular gets the singular noun; 1–10 use written
   numerals (one / 三); 11+ fall back to digits. */
function takeawayHeading(count: number, lang: "en" | "zh"): string {
  if (lang === "zh") {
    const zhNum = ["零", "一", "两", "三", "四", "五", "六", "七", "八", "九", "十"];
    if (count === 1) return "一个想法，值得带走。";
    const num = count >= 2 && count <= 10 ? zhNum[count] : String(count);
    return `${num}点想法，值得带走。`;
  }
  const enNum = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  if (count === 1) return "One idea worth carrying.";
  const word = count >= 2 && count <= 10 ? enNum[count] : String(count);
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  return `${cap} ideas worth carrying.`;
}

function estimateReadMinutes(summary: Summary | null, takeaways: Takeaway[]): number {
  let words = 0;
  const count = (s: string) => s.trim().split(/\s+/).length;
  if (summary) {
    words += count(summary.thesis);
    summary.paragraphs.forEach(p => { words += count(p); });
    if (summary.memorableQuote) words += count(summary.memorableQuote);
    summary.beginnerExplanation?.forEach(p => { words += count(p); });
  }
  takeaways.forEach(tk => { words += count(tk.title) + count(tk.detail); });
  return Math.max(1, Math.round(words / 220));
}

