"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon, Logo, type IconName } from "@/components/icons";
import { LangSwitch, Segmented } from "@/components/primitives";
import { NoteTagEditor } from "@/components/note-tag-editor";
import { savedLabel, useNotes } from "@/lib/hooks/use-notes";
import {
  AuthRequiredError, getHighlights, getNote, getReviewItems, getSummary,
  getTakeaways, listSources, setNoteTags, summarize,
  type Highlight, type ReviewItem, type Source, type SourceType, type Summary, type Takeaway,
} from "@/lib/api";

type Tab = "summary" | "takeaways" | "explain";

export default function Workspace() {
  const router = useRouter();
  const { t, lang } = useLang();

  /* ================ state ================ */
  const [sources, setSources] = useState<Source[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [sourceType, setSourceType] = useState<SourceType>("blog");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  /* Featured source (most recent) + its associated data */
  const currentSource = sources[0] ?? null;
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [currentTakeaways, setCurrentTakeaways] = useState<Takeaway[]>([]);
  const [currentHighlights, setCurrentHighlights] = useState<Highlight[]>([]);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const currentId = currentSource?.id ?? "";
  const { notes, setNotes, savedAt } = useNotes(currentId, "");

  /* ================ effects ================ */
  useEffect(() => {
    let cancelled = false;
    listSources().then(s => { if (!cancelled) setSources(s); });
    getReviewItems({ onlyDue: true }).then(items => { if (!cancelled) setReviewItems(items); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    Promise.all([getSummary(currentId), getTakeaways(currentId), getHighlights(currentId), getNote(currentId)])
      .then(([sum, tk, hl, note]) => {
        if (cancelled) return;
        setCurrentSummary(sum);
        setCurrentTakeaways(tk);
        setCurrentHighlights(hl);
        setCurrentTags(note?.tags ?? []);
      });
    return () => { cancelled = true; };
  }, [currentId]);

  /* ================ handlers ================ */
  const openSource = (id: string) => router.push(`/read/${id}`);

  const submit = async () => {
    const value = url.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await summarize({ url: value, type: sourceType, lang });
      router.push(`/read/${res.source.id}`);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.push("/sign-in?next=/workspace");
        return;
      }
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  const addTag = async (tag: string) => {
    if (!currentSource) return;
    const clean = tag.trim();
    if (!clean || currentTags.includes(clean)) return;
    const next = [...currentTags, clean];
    setCurrentTags(next);
    const saved = await setNoteTags(currentSource.id, next);
    setCurrentTags(saved.tags);
  };
  const removeTag = async (tag: string) => {
    if (!currentSource) return;
    const next = currentTags.filter(t => t !== tag);
    setCurrentTags(next);
    const saved = await setNoteTags(currentSource.id, next);
    setCurrentTags(saved.tags);
  };

  /* ================ derived data ================ */
  const history = useMemo(() => {
    const rest = sources.filter(s => s.id !== currentId);
    const q = query.trim().toLowerCase();
    if (!q) return rest;
    return rest.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.author.toLowerCase().includes(q) ||
      (s.takeaway ?? "").toLowerCase().includes(q)
    );
  }, [sources, currentId, query]);

  const collections = useMemo(() => {
    const labels: Record<string, string> = {
      ml: t("dash.col.ml"),
      phil: t("dash.col.phil"),
      design: t("dash.col.design"),
      writing: t("nbp.col.writing"),
      learn: t("nbp.col.learn"),
    };
    const counts = new Map<string, number>();
    for (const s of sources) {
      const c = s.collectionId;
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, name: labels[id] ?? id, count }))
      .sort((a, b) => b.count - a.count);
  }, [sources, t]);

  const dueCount = reviewItems.length;
  const nav: { id: string; label: string; icon: IconName; active?: boolean; disabled?: boolean; badge?: number; go?: () => void }[] = [
    { id: "home",      label: t("dash.nav.home"),     icon: "home",     go: () => router.push("/") },
    { id: "dashboard", label: t("dash.nav.work"),     icon: "sparkle",  active: true },
    { id: "notebook",  label: t("dash.nav.notebook"), icon: "notebook", go: () => router.push("/notebook") },
    { id: "review",    label: t("dash.nav.review"),   icon: "brain",    go: () => router.push("/notebook?view=review"), badge: dueCount || undefined },
    { id: "archive",   label: t("dash.nav.archive"),  icon: "archive",  go: () => router.push("/notebook?view=archive") },
  ];

  const hasNotes = sources.length > 0;

  return (
    <div style={{
      position: "relative", zIndex: 2,
      display: "grid",
      gridTemplateColumns: "248px 1fr 340px",
      gap: 16,
      padding: 16,
      height: "100vh",
      maxWidth: 1600, margin: "0 auto",
    }}>
      {/* ================ SIDEBAR ================ */}
      <aside className="glass-strong" style={{
        padding: 18, borderRadius: 22,
        display: "flex", flexDirection: "column", gap: 18,
        overflow: "hidden",
      }}>
        <div style={{ padding: "4px 6px" }}>
          <Logo size={22}/>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => { router.push("/"); }}
          style={{ justifyContent: "center", padding: "10px 16px", fontSize: 13 }}
        >
          <Icon name="plus" size={14}/> {t("dash.new")}
        </button>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map(n => (
            <button
              key={n.id}
              onClick={() => { if (!n.disabled) n.go?.(); }}
              disabled={n.disabled}
              title={n.disabled ? (lang === "zh" ? "即将推出" : "Coming soon") : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                border: "none",
                background: n.active ? "rgba(255,255,255,0.7)" : "transparent",
                boxShadow: n.active ? "0 0 0 0.5px rgba(23,42,82,0.06), 0 1px 2px rgba(23,42,82,0.04)" : "none",
                borderRadius: 10,
                color: n.active ? "var(--ink-900)" : n.disabled ? "var(--ink-300)" : "var(--ink-500)",
                fontSize: 13, fontWeight: n.active ? 550 : 450,
                cursor: n.disabled ? "not-allowed" : "pointer",
                textAlign: "left", fontFamily: "var(--font-ui)",
                letterSpacing: "-0.005em",
                transition: "all 200ms var(--ease)",
                opacity: n.disabled ? 0.55 : 1,
              }}
            >
              <Icon name={n.icon} size={15}/>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge !== undefined && n.badge > 0 && (
                <span style={{
                  fontSize: 10.5, fontWeight: 600,
                  padding: "1px 7px", borderRadius: 999,
                  background: "oklch(0.42 0.10 248)",
                  color: "white",
                  fontFamily: "var(--font-mono)",
                }}>{n.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {collections.length > 0 && (
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "4px 8px", marginBottom: 6,
            }}>
              <span className="eyebrow" style={{ fontSize: 10.5 }}>{t("dash.col")}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {collections.map(c => (
                <button
                  key={c.id}
                  onClick={() => router.push("/notebook")}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 10px", border: "none", background: "transparent",
                    borderRadius: 8, color: "var(--ink-700)",
                    fontSize: 12.5, cursor: "pointer", textAlign: "left",
                    fontFamily: "var(--font-ui)",
                    transition: "all 160ms var(--ease)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon name="folder" size={13} style={{ color: "var(--ink-400)" }}/>
                  <span style={{ flex: 1, textAlign: "left" }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{
          marginTop: "auto", padding: 12, borderRadius: 14,
          background: "linear-gradient(180deg, oklch(0.94 0.04 235 / 0.7), oklch(0.96 0.02 235 / 0.5))",
          border: "0.5px solid rgba(23,42,82,0.06)",
        }}>
          <div style={{ fontSize: 11, color: "var(--ink-500)", marginBottom: 6 }}>{t("dash.streak")}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
            <span className="display" style={{ fontSize: 28, color: "var(--accent-deep)" }}>{sources.length}</span>
            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>
              {lang === "zh" ? "篇笔记" : sources.length === 1 ? "note" : "notes"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const filled = i < Math.min(sources.length, 14);
              return (
                <div key={i} style={{
                  flex: 1, height: 22, borderRadius: 3,
                  background: filled
                    ? `oklch(${0.55 + i * 0.02} 0.09 240)`
                    : "rgba(23,42,82,0.08)",
                }}/>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ================ CENTER ================ */}
      <main style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
        <div className="glass-strong" style={{
          padding: "10px 14px", borderRadius: 16,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="search" size={15} style={{ color: "var(--ink-400)", marginLeft: 4 }}/>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("dash.search")}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 13.5, fontFamily: "var(--font-ui)",
              color: "var(--ink-900)", letterSpacing: "-0.005em",
            }}
          />
          <div style={{ width: 1, height: 18, background: "rgba(23,42,82,0.1)" }}/>
          <LangSwitch compact/>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "auto", paddingRight: 4 }}>
          <div style={{ padding: "8px 4px" }}>
            <div className="eyebrow">{todayLabel(lang)}</div>
            <h1 className="display" style={{ fontSize: 44, margin: "6px 0 0", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {greeting(lang)}
            </h1>
            <p style={{ fontSize: 14.5, color: "var(--ink-500)", marginTop: 14 }}>
              {statusLine(sources.length, lang)}
            </p>
          </div>

          {/* New source card */}
          <div className="glass" style={{ padding: 20, borderRadius: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 550, color: "var(--ink-900)", minWidth: 0, whiteSpace: "nowrap" }}>
                <Icon name="sparkle" size={14} style={{ marginRight: 6, color: "var(--accent-deep)", verticalAlign: -2 }}/>
                {t("dash.card.turn")}
              </div>
              <Segmented<SourceType>
                value={sourceType}
                onChange={setSourceType}
                options={[
                  { value: "blog",    label: t("dash.mode.blog"), icon: "blog"    },
                  { value: "podcast", label: t("dash.mode.pod"),  icon: "podcast" },
                  { value: "video",   label: t("dash.mode.vid"),  icon: "video"   },
                ]}
              />
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px",
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(23,42,82,0.08)",
              borderRadius: 12,
            }}>
              <Icon name={sourceType} size={16} style={{ color: "var(--ink-500)" }}/>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submit(); }}
                placeholder={t("dash.paste")}
                disabled={submitting}
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontSize: 14, fontFamily: "var(--font-ui)", color: "var(--ink-900)",
                }}
              />
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={submitting || !url.trim()}
                style={{
                  fontSize: 12.5, padding: "7px 14px",
                  opacity: (submitting || !url.trim()) ? 0.6 : 1,
                  cursor: (submitting || !url.trim()) ? "not-allowed" : "pointer",
                }}
              >
                {submitting
                  ? <><span className="ml-spinner" aria-hidden/> {lang === "zh" ? "整理中…" : "Summarizing…"}</>
                  : <>{t("dash.summarize")} <Icon name="arrow" size={13}/></>}
              </button>
            </div>

            {submitError && (
              <div role="alert" style={{
                marginTop: 12, padding: "10px 14px",
                borderRadius: 12,
                background: "oklch(0.96 0.04 25 / 0.55)",
                border: "0.5px solid oklch(0.78 0.10 25 / 0.5)",
                color: "oklch(0.38 0.10 25)",
                fontSize: 13, lineHeight: 1.5,
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <Icon name="bolt" size={14} style={{ marginTop: 2, flexShrink: 0 }}/>
                <span style={{ flex: 1 }}>{submitError}</span>
                <button onClick={() => setSubmitError(null)} aria-label="Dismiss" style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  color: "inherit", padding: 0, opacity: 0.7,
                }}>
                  <Icon name="x" size={12}/>
                </button>
              </div>
            )}
          </div>

          {/* Currently reading — featured source */}
          {currentSource && (
            <div className="glass" style={{ padding: 24, borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14, gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `oklch(0.94 0.04 ${currentSource.hue})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: `oklch(0.40 0.09 ${currentSource.hue})`,
                    flexShrink: 0,
                  }}><Icon name={currentSource.type} size={17}/></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {t("dash.current")}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 550 }} className="truncate">{currentSource.title}</div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={() => openSource(currentSource.id)}
                  style={{ fontSize: 12, padding: "6px 12px", flexShrink: 0 }}
                >
                  {t("dash.open")} <Icon name="arrow" size={12}/>
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 14, borderBottom: "0.5px solid rgba(23,42,82,0.08)" }}>
                {([
                  { id: "summary",    label: t("dash.tab.sum") },
                  { id: "takeaways",  label: t("dash.tab.take") },
                  { id: "explain",    label: t("dash.tab.explain") },
                ] as { id: Tab; label: string }[]).map(tb => (
                  <button key={tb.id} onClick={() => setActiveTab(tb.id)}
                    style={{
                      border: "none", background: "transparent",
                      padding: "8px 2px", marginRight: 8,
                      fontSize: 12.5, fontWeight: 500,
                      color: activeTab === tb.id ? "var(--ink-900)" : "var(--ink-500)",
                      borderBottom: activeTab === tb.id ? "1.5px solid var(--accent-deep)" : "1.5px solid transparent",
                      marginBottom: -1,
                      cursor: "pointer", fontFamily: "var(--font-ui)",
                      transition: "all 200ms var(--ease)",
                    }}>{tb.label}</button>
                ))}
              </div>

              <div key={activeTab} style={{ animation: "reveal 400ms var(--ease)" }}>
                {activeTab === "summary" && (
                  currentSummary ? (
                    <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-700)" }}>
                      <p style={{ marginTop: 0, fontWeight: 550, color: "var(--ink-900)" }}>
                        {currentSummary.thesis}
                      </p>
                      {currentSummary.paragraphs.slice(0, 2).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  ) : (
                    <EmptyContent lang={lang}/>
                  )
                )}
                {activeTab === "takeaways" && (
                  currentTakeaways.length > 0 ? (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                      {currentTakeaways.map((tk, i) => (
                        <li key={tk.id} style={{ display: "flex", gap: 12, fontSize: 14, color: "var(--ink-700)" }}>
                          <span className="mono" style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{tk.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyContent lang={lang}/>
                  )
                )}
                {activeTab === "explain" && (
                  currentSummary?.beginnerExplanation && currentSummary.beginnerExplanation.length > 0 ? (
                    <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-700)" }}>
                      {currentSummary.beginnerExplanation.slice(0, 2).map((p, i) => (
                        <p key={i} style={i === 0 ? { marginTop: 0 } : undefined}>{p}</p>
                      ))}
                    </div>
                  ) : (
                    <EmptyContent lang={lang}/>
                  )
                )}
              </div>
            </div>
          )}

          {/* Empty state: no sources yet */}
          {!hasNotes && (
            <div className="glass" style={{
              padding: 36, borderRadius: 20, textAlign: "center",
              display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
            }}>
              <Icon name="leaf" size={22} style={{ color: "var(--accent-deep)", opacity: 0.6 }}/>
              <div className="display" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
                {lang === "zh" ? "笔记本是空的。" : "Your notebook is empty."}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-500)", maxWidth: 340, lineHeight: 1.55 }}>
                {lang === "zh"
                  ? "粘贴第一篇文章、播客或视频的链接，让它变成一则笔记。"
                  : "Paste a link to your first article, podcast, or video and turn it into a note."}
              </div>
            </div>
          )}

          {/* Recent history */}
          {history.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 10px" }}>
                <div className="eyebrow">{t("dash.recent")}</div>
                <button
                  onClick={() => router.push("/notebook")}
                  style={{ background: "none", border: "none", color: "var(--ink-500)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-ui)" }}
                >
                  {t("dash.seeAll")} <Icon name="chevron" size={11} style={{ verticalAlign: -1 }}/>
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {history.map(h => (
                  <div key={h.id} className="glass" onClick={() => openSource(h.id)} style={{
                    padding: 16, borderRadius: 14, cursor: "pointer",
                    transition: "all 280ms var(--ease)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: `oklch(0.95 0.03 ${h.hue})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: `oklch(0.40 0.09 ${h.hue})`,
                      }}><Icon name={h.type} size={13}/></div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-400)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {h.type} · {relativeTime(h.addedAt, lang)}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 550, marginBottom: 4, letterSpacing: "-0.005em" }} className="truncate">
                      {h.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-500)" }} className="truncate">
                      {h.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search result empty */}
          {history.length === 0 && query && (
            <div style={{
              padding: 24, textAlign: "center",
              fontSize: 13, color: "var(--ink-500)",
            }}>
              {lang === "zh" ? `没找到匹配 "${query}" 的笔记。` : `No notes match "${query}".`}
            </div>
          )}
        </div>
      </main>

      {/* ================ RIGHT PANEL ================ */}
      <aside className="glass-strong" style={{
        padding: 18, borderRadius: 22, overflow: "auto",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        {currentSource ? (
          <>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="eyebrow">{t("dash.right.notes")}</span>
                <span style={{ fontSize: 10.5, color: "var(--ink-400)" }}>
                  {savedLabel(savedAt, lang, t("det.notes.saved"))}
                </span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={lang === "zh" ? "为这篇写点笔记……" : "Jot something for this source…"}
                style={{
                  width: "100%", minHeight: 120,
                  border: "0.5px solid rgba(23,42,82,0.08)",
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: 12, padding: 12,
                  fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6,
                  color: "var(--ink-900)", resize: "none", outline: "none",
                  letterSpacing: "-0.005em",
                }}
              />
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>{t("dash.right.hls")}</div>
              {currentHighlights.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {currentHighlights.map(h => (
                    <div key={h.id} style={{
                      padding: "10px 12px", borderRadius: 10,
                      background: `oklch(0.96 0.03 ${h.hue} / 0.55)`,
                      borderLeft: `2px solid oklch(0.70 0.1 ${h.hue})`,
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

            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>{t("dash.right.tags")}</div>
              <NoteTagEditor
                tags={currentTags}
                onAdd={addTag}
                onRemove={removeTag}
                addLabel={t("det.tag.add")}
                placeholder={t("det.tag.placeholder")}
              />
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>{t("dash.right.conn")}</div>
              {history.slice(0, 3).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {history.slice(0, 3).map(n => (
                    <a
                      key={n.id} href={`/read/${n.id}`}
                      style={{
                        fontSize: 12.5, color: "var(--ink-700)", textDecoration: "none",
                        padding: "8px 10px", borderRadius: 8,
                        display: "flex", alignItems: "center", gap: 8,
                        transition: "all 200ms var(--ease)",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon name={n.type} size={12} style={{ color: "var(--ink-400)" }}/>
                      <span className="truncate">{n.title}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.55 }}>
                  {t("det.connected.empty")}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{
            padding: "40px 16px", textAlign: "center",
            fontSize: 13, color: "var(--ink-500)", lineHeight: 1.55,
          }}>
            {lang === "zh"
              ? "笔记本里还没有内容。从左边粘一个链接开始。"
              : "Your notebook is empty. Paste a link on the left to begin."}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ============================================================
   Small helpers — keep the JSX above readable.
   ============================================================ */

function EmptyContent({ lang }: { lang: "en" | "zh" }) {
  return (
    <div style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.55, fontStyle: "italic" }}>
      {lang === "zh" ? "这份内容还没有摘要数据。" : "No summary data for this source yet."}
    </div>
  );
}

function todayLabel(lang: "en" | "zh"): string {
  const d = new Date();
  return d.toLocaleDateString(
    lang === "zh" ? "zh-CN" : "en-US",
    lang === "zh"
      ? { month: "numeric", day: "numeric", weekday: "long" }
      : { weekday: "long", month: "long", day: "numeric" }
  );
}

function greeting(lang: "en" | "zh"): string {
  const h = new Date().getHours();
  if (lang === "zh") {
    if (h < 5)  return "夜深了。";
    if (h < 12) return "早上好。";
    if (h < 18) return "下午好。";
    return "晚上好。";
  }
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

function statusLine(count: number, lang: "en" | "zh"): string {
  if (count === 0) {
    return lang === "zh"
      ? "笔记本是空的——先把一份内容带进来。"
      : "Your notebook is empty — bring something in to get started.";
  }
  if (lang === "zh") {
    return `笔记本里有 ${count} 篇。继续读下去。`;
  }
  return count === 1
    ? "One note in your notebook. Keep going."
    : `${count} notes in your notebook. Keep going.`;
}

function relativeTime(iso: string, lang: "en" | "zh"): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  const mins = Math.round(elapsed / 60_000);
  const hours = Math.round(elapsed / 3600_000);
  const days = Math.round(elapsed / 86400_000);
  if (lang === "zh") {
    if (mins < 60)  return `${Math.max(1, mins)} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7)   return `${days} 天前`;
    return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  }
  if (mins < 60)  return mins <= 1 ? "just now" : `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
