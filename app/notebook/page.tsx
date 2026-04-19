"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon, Logo } from "@/components/icons";
import { LangSwitch, Progress, Segmented } from "@/components/primitives";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  deleteSource, getReviewItems, listSources, rateReview,
  type Rating, type ReviewItem, type Source,
} from "@/lib/api";

type View = "grid" | "list" | "review";
type CollectionId = "all" | "ml" | "design" | "phil" | "writing" | "learn";

function formatDate(iso: string, lang: "en" | "zh"): string {
  try {
    return new Date(iso).toLocaleDateString(
      lang === "zh" ? "zh-CN" : "en-US",
      { month: lang === "zh" ? "numeric" : "long", day: "numeric" }
    );
  } catch { return iso.slice(0, 10); }
}

export default function Notebook() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [view, setView] = useState<View>("grid");
  const [collection, setCollection] = useState<CollectionId>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [sources, setSources] = useState<Source[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSources().then(s => {
      if (cancelled) return;
      setSources(s);
    });
    getReviewItems().then(items => {
      if (cancelled) return;
      setReviewItems(items);
    });
    return () => { cancelled = true; };
  }, []);

  /* Support /notebook?view=review deep-link (e.g. from Workspace nav). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "review") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("review");
    }
  }, []);

  const openSource = (id: string) => router.push(`/read/${id}`);

  const askDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await deleteSource(id);
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const pendingSource = sources.find(s => s.id === pendingDeleteId);

  /* Reviews: derive due list from loaded items. An item is due if it
     has never been reviewed OR its dueAt is in the past. The current
     wall-clock read is deliberate — we want to re-evaluate each render
     so cards tick in as they come due during a long session. */
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const dueItems = reviewItems.filter(it => !it.state || new Date(it.state.dueAt).getTime() <= nowMs);
  const currentReview = dueItems[reviewIdx] ?? null;

  const startReviewSession = () => {
    setView("review");
    setReviewIdx(0);
    setRevealed(false);
  };

  const rateCurrent = async (rating: Rating) => {
    if (!currentReview) return;
    const state = await rateReview(currentReview.source.id, rating);
    /* Update the item's state in place so subsequent renders see it,
       even though we don't re-filter the session list mid-stream. */
    setReviewItems(prev =>
      prev.map(it => it.source.id === state.sourceId ? { ...it, state } : it)
    );
    setReviewIdx(i => i + 1);
    setRevealed(false);
  };

  const collections: { id: CollectionId; label: string; count: number }[] = useMemo(() => [
    { id: "all",     label: t("nbp.col.all"),     count: sources.length },
    { id: "ml",      label: t("nbp.col.ml"),      count: sources.filter(c => c.collectionId === "ml").length },
    { id: "design",  label: t("nbp.col.design"),  count: sources.filter(c => c.collectionId === "design").length },
    { id: "phil",    label: t("nbp.col.phil"),    count: sources.filter(c => c.collectionId === "phil").length },
    { id: "writing", label: t("nbp.col.writing"), count: sources.filter(c => c.collectionId === "writing").length },
    { id: "learn",   label: t("nbp.col.learn"),   count: sources.filter(c => c.collectionId === "learn").length },
  ], [sources, t]);

  const ALL_TAGS = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sources) for (const tg of s.tags) counts.set(tg, (counts.get(tg) ?? 0) + 1);
    return [...counts.entries()].map(([tname, n]) => ({ t: tname, n })).sort((a, b) => b.n - a.n);
  }, [sources]);

  const filtered = sources.filter(c => {
    if (collection !== "all" && c.collectionId !== collection) return false;
    if (tag && !c.tags.includes(tag)) return false;
    if (q && !((c.title + c.author + (c.takeaway ?? "")).toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div style={{
      position: "relative", zIndex: 2,
      display: "grid",
      gridTemplateColumns: "260px 1fr",
      gap: 16, padding: 16,
      maxWidth: 1600, margin: "0 auto",
      minHeight: "100vh",
    }}>
      {/* SIDEBAR */}
      <aside className="glass-strong" style={{
        padding: 18, borderRadius: 22,
        display: "flex", flexDirection: "column", gap: 20,
        position: "sticky", top: 16, alignSelf: "start",
        maxHeight: "calc(100vh - 32px)", overflow: "auto",
      }}>
        <div style={{ padding: "4px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size={22}/>
          <button onClick={() => router.push("/workspace")}
            className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }}>
            <Icon name="x" size={13}/>
          </button>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", marginBottom: 6 }}>
            <div className="eyebrow">{t("nbp.coll")}</div>
            <LangSwitch compact/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {collections.map(c => {
              const active = c.id === collection;
              return (
                <button key={c.id} onClick={() => setCollection(c.id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", border: "none",
                  background: active ? "rgba(255,255,255,0.75)" : "transparent",
                  boxShadow: active ? "0 0 0 0.5px rgba(23,42,82,0.06), 0 1px 2px rgba(23,42,82,0.04)" : "none",
                  borderRadius: 10,
                  color: active ? "var(--ink-900)" : "var(--ink-700)",
                  fontSize: 13, fontWeight: active ? 550 : 450,
                  cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--font-ui)",
                  transition: "all 200ms var(--ease)",
                }}>
                  <Icon name={c.id === "all" ? "grid" : "folder"} size={13} style={{ color: active ? "var(--accent-deep)" : "var(--ink-400)" }}/>
                  <span style={{ flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>{c.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", marginBottom: 8 }}>
            <span className="eyebrow">{t("nbp.filter")}</span>
            {tag && (
              <button onClick={() => setTag(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-500)", fontSize: 11 }}>
                {t("nbp.clear")}
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "0 4px" }}>
            {ALL_TAGS.map(g => (
              <button key={g.t} onClick={() => setTag(tag === g.t ? null : g.t)}
                style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 9px", fontSize: 11.5, fontWeight: 500,
                  borderRadius: 999,
                  background: tag === g.t ? "oklch(0.42 0.10 248)" : "rgba(23,42,82,0.05)",
                  color: tag === g.t ? "#fff" : "var(--ink-700)",
                  transition: "all 200ms var(--ease)",
                }}>
                  {g.t}
                  <span style={{ fontSize: 10, opacity: 0.7, fontFamily: "var(--font-mono)" }}>{g.n}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-weak" style={{ padding: 14, borderRadius: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="brain" size={13} style={{ color: "oklch(0.48 0.10 295)" }}/>
            <span style={{ fontSize: 12, fontWeight: 550 }}>{t("nbp.rev.today")}</span>
          </div>
          <div className="display" style={{ fontSize: 32, margin: "0 0 2px", letterSpacing: "-0.02em" }}>
            {dueItems.length}
            <span style={{ fontSize: 13, color: "var(--ink-500)", fontFamily: "var(--font-ui)" }}>
              {" "}/ {reviewItems.length} {t("nbp.rev.due")}
            </span>
          </div>
          <Progress value={reviewItems.length ? dueItems.length / reviewItems.length : 0}/>
          <button
            className="btn btn-ghost"
            onClick={startReviewSession}
            disabled={dueItems.length === 0}
            style={{
              width: "100%", justifyContent: "center", fontSize: 12,
              padding: "7px 12px", marginTop: 12,
              opacity: dueItems.length === 0 ? 0.5 : 1,
              cursor: dueItems.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {t("nbp.rev.start")}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div className="eyebrow">{t("nbp.eyebrow")}</div>
          <h1 className="display" style={{ fontSize: 60, margin: "8px 0 4px", letterSpacing: "-0.025em", lineHeight: 1.05 }}>
            {t("nbp.title")}
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-500)", maxWidth: 560, marginTop: 18 }}>
            {filtered.length} {t("nbp.sub.a")} {collection !== "all" && `${t("nbp.sub.in")} ${collections.find(c => c.id === collection)!.label.toLowerCase()}`}{tag && ` ${t("nbp.sub.tagged")} #${tag}`}.
            {" "}{t("nbp.sub.b")}
          </p>
        </div>

        <div className="glass-strong" style={{
          padding: "10px 14px", borderRadius: 16,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="search" size={15} style={{ color: "var(--ink-400)", marginLeft: 4 }}/>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("nbp.search")}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 13.5, fontFamily: "var(--font-ui)", color: "var(--ink-900)",
            }}/>
          <div style={{ width: 1, height: 18, background: "rgba(23,42,82,0.1)" }}/>
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: "grid",   label: t("nbp.view.grid"),   icon: "grid"  },
              { value: "list",   label: t("nbp.view.list"),   icon: "list"  },
              { value: "review", label: t("nbp.view.rev"),    icon: "brain" },
            ]}
          />
        </div>

        {view === "grid" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {filtered.map((c, i) => (
              <div key={c.id} onClick={() => openSource(c.id)} className="reveal"
                style={{
                  animationDelay: `${i * 40}ms`,
                  background: "rgba(255,255,255,0.55)",
                  backdropFilter: "blur(22px) saturate(160%)",
                  WebkitBackdropFilter: "blur(22px) saturate(160%)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 0.5px rgba(23,42,82,0.06), 0 8px 24px -12px rgba(23,42,82,0.12)",
                  borderRadius: 18,
                  padding: 18,
                  cursor: "pointer",
                  transition: "all 320ms var(--ease)",
                  display: "flex", flexDirection: "column", gap: 12,
                  minHeight: 260,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 0.5px rgba(23,42,82,0.08), 0 20px 40px -16px rgba(23,42,82,0.2)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 0.5px rgba(23,42,82,0.06), 0 8px 24px -12px rgba(23,42,82,0.12)";
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7,
                      background: `oklch(0.95 0.03 ${c.hue})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: `oklch(0.40 0.09 ${c.hue})`,
                    }}><Icon name={c.type} size={12}/></div>
                    <span style={{ fontSize: 11, color: "var(--ink-500)", fontWeight: 500 }}>{c.author}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon
                      name="bookmark" size={13}
                      style={{
                        color: c.bookmarked ? "var(--accent-deep)" : "var(--ink-400)",
                        fill: c.bookmarked ? "currentColor" : "none",
                      }}
                    />
                    <button
                      onClick={e => askDelete(e, c.id)}
                      aria-label={t("nbp.delete")}
                      title={t("nbp.delete")}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 24, height: 24, padding: 0,
                        border: "none", background: "transparent",
                        borderRadius: 7, cursor: "pointer",
                        color: "var(--ink-400)",
                        transition: "all 200ms var(--ease)",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "oklch(0.95 0.05 25 / 0.6)";
                        e.currentTarget.style.color = "oklch(0.42 0.13 25)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--ink-400)";
                      }}
                    >
                      <Icon name="trash" size={13}/>
                    </button>
                  </div>
                </div>

                <h3 className="display" style={{
                  fontSize: 22, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.15,
                }}>{c.title}</h3>

                <p style={{
                  fontSize: 13, lineHeight: 1.55, color: "var(--ink-700)", margin: 0,
                  fontStyle: "italic",
                }}>&ldquo;{c.takeaway}&rdquo;</p>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.tags.slice(0, 2).map(tt => (
                      <span key={tt} style={{
                        fontSize: 10.5, color: "var(--ink-500)", fontWeight: 500,
                        padding: "2px 7px", background: "rgba(23,42,82,0.05)",
                        borderRadius: 999,
                      }}>#{tt}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "var(--ink-400)" }}>
                    <span><Icon name="notebook" size={10} style={{ verticalAlign: -1, marginRight: 3 }}/>{c.notesCount ?? 0}</span>
                    <span><Icon name="highlight" size={10} style={{ verticalAlign: -1, marginRight: 3 }}/>{c.highlightsCount ?? 0}</span>
                  </div>
                </div>

                <div style={{ fontSize: 10, color: "var(--ink-400)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                  {formatDate(c.addedAt, lang)}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "list" && (
          <div className="glass-strong" style={{ padding: 4, borderRadius: 18, overflow: "hidden" }}>
            {filtered.map((c, i) => {
              const rowStyle: CSSProperties = {
                display: "grid",
                gridTemplateColumns: "36px 1fr 200px 140px 100px 32px",
                alignItems: "center", gap: 16,
                padding: "14px 18px",
                borderBottom: i < filtered.length - 1 ? "0.5px solid rgba(23,42,82,0.06)" : "none",
                cursor: "pointer",
                transition: "background 200ms var(--ease)",
                borderRadius: 12,
              };
              return (
                <div key={c.id} onClick={() => openSource(c.id)} style={rowStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.5)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: `oklch(0.95 0.03 ${c.hue})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: `oklch(0.40 0.09 ${c.hue})`,
                  }}><Icon name={c.type} size={13}/></div>

                  <div>
                    <div className="display" style={{ fontSize: 16, letterSpacing: "-0.01em" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>&ldquo;{c.takeaway}&rdquo;</div>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{c.author}</div>

                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.tags.slice(0, 2).map(tt => (
                      <span key={tt} style={{
                        fontSize: 10.5, color: "var(--ink-500)",
                        padding: "2px 7px", background: "rgba(23,42,82,0.05)",
                        borderRadius: 999,
                      }}>#{tt}</span>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                    {formatDate(c.addedAt, lang)}
                  </div>

                  <button
                    onClick={e => askDelete(e, c.id)}
                    aria-label={t("nbp.delete")}
                    title={t("nbp.delete")}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 28, height: 28, padding: 0,
                      border: "none", background: "transparent",
                      borderRadius: 8, cursor: "pointer",
                      color: "var(--ink-400)",
                      transition: "all 200ms var(--ease)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "oklch(0.95 0.05 25 / 0.6)";
                      e.currentTarget.style.color = "oklch(0.42 0.13 25)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--ink-400)";
                    }}
                  >
                    <Icon name="trash" size={13}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {view === "review" && (
          <ReviewView
            lang={lang}
            dueItems={dueItems}
            totalItems={reviewItems.length}
            currentIdx={reviewIdx}
            current={currentReview}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onRate={rateCurrent}
            onOpen={(id) => router.push(`/read/${id}`)}
            t={t}
          />
        )}
      </main>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title={pendingSource ? `${t("nbp.delete.title")}` : t("nbp.delete.title")}
        body={
          <>
            <div style={{ marginBottom: 8, color: "var(--ink-700)", fontWeight: 500 }}>
              &ldquo;{pendingSource?.title ?? ""}&rdquo;
            </div>
            {t("nbp.delete.body")}
          </>
        }
        destructive
        confirmLabel={t("nbp.delete")}
        cancelLabel={t("nbp.delete.cancel")}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

/* ============================================================
   Review view — spaced-repetition card flow.
   ============================================================ */
type ReviewProps = {
  lang: "en" | "zh";
  dueItems: ReviewItem[];
  totalItems: number;
  currentIdx: number;
  current: ReviewItem | null;
  revealed: boolean;
  onReveal: () => void;
  onRate: (rating: Rating) => void;
  onOpen: (id: string) => void;
  t: (k: string) => string;
};

function ReviewView({
  lang, dueItems, totalItems, currentIdx, current, revealed, onReveal, onRate, onOpen, t,
}: ReviewProps) {
  /* Empty-notebook state — no review cards exist yet. */
  if (totalItems === 0) {
    return (
      <div className="glass" style={{
        padding: 48, borderRadius: 22, textAlign: "center",
        display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
        minHeight: 320, justifyContent: "center",
      }}>
        <Icon name="brain" size={28} style={{ color: "oklch(0.48 0.10 295)", opacity: 0.6 }}/>
        <div className="display" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
          {t("rev.empty.title")}
        </div>
        <div style={{ fontSize: 14, color: "var(--ink-500)", maxWidth: 420, lineHeight: 1.55 }}>
          {t("rev.empty.body")}
        </div>
      </div>
    );
  }

  /* All caught up — has cards but nothing due. */
  if (dueItems.length === 0 || currentIdx >= dueItems.length || !current) {
    return (
      <div className="glass" style={{
        padding: 48, borderRadius: 22, textAlign: "center",
        display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
        minHeight: 320, justifyContent: "center",
      }}>
        <Icon name="check" size={28} style={{ color: "var(--accent-deep)", opacity: 0.7 }}/>
        <div className="display" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
          {t("rev.done.title")}
        </div>
        <div style={{ fontSize: 14, color: "var(--ink-500)", maxWidth: 440, lineHeight: 1.55 }}>
          {t("rev.done.body")}
        </div>
      </div>
    );
  }

  const source = current.source;
  const progress = (currentIdx + 1) / dueItems.length;
  const upNext = dueItems.slice(currentIdx + 1, currentIdx + 4);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Active card */}
      <div className="glass" style={{
        padding: 32, borderRadius: 22,
        display: "flex", flexDirection: "column", gap: 20,
        minHeight: 420,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span className="eyebrow">
            {t("rev.progress").replace("{n}", String(currentIdx + 1)).replace("{total}", String(dueItems.length))}
          </span>
          <div style={{ flex: 1, maxWidth: 140 }}><Progress value={progress}/></div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={source.type} size={12}/>
            <span className="truncate">{source.author}</span>
            {current.state?.lastReviewedAt && (
              <>
                <span style={{ color: "var(--ink-300)" }}>·</span>
                <span>{lastReviewedLabel(current.state.lastReviewedAt, lang)}</span>
              </>
            )}
          </div>
          <h3
            className="display"
            style={{
              fontSize: 28, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.15,
              cursor: "pointer",
            }}
            onClick={() => onOpen(source.id)}
            title={lang === "zh" ? "打开这篇" : "Open this source"}
          >
            {source.title}
          </h3>
        </div>

        {/* Answer zone: hidden → reveal prompt / shown → the quote */}
        <div style={{
          padding: 20, borderRadius: 16,
          background: revealed
            ? `linear-gradient(180deg, oklch(0.95 0.03 ${source.hue} / 0.7), oklch(0.97 0.02 ${source.hue} / 0.3))`
            : "rgba(23,42,82,0.03)",
          border: "0.5px solid rgba(23,42,82,0.06)",
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 300ms var(--ease)",
          minHeight: 120,
        }}>
          {revealed ? (
            <blockquote className="display" style={{
              margin: 0, fontSize: 22, lineHeight: 1.35, textAlign: "center",
              color: "var(--ink-900)", fontStyle: "italic", letterSpacing: "-0.015em",
            }}>
              &ldquo;{current.quote}&rdquo;
            </blockquote>
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
              color: "var(--ink-500)",
            }}>
              <div style={{ fontSize: 14, fontStyle: "italic" }}>{t("rev.prompt")}</div>
              <button
                onClick={onReveal}
                className="btn btn-ghost pressable"
                style={{ padding: "9px 16px", fontSize: 13 }}
              >
                <Icon name="sparkle" size={13}/> {t("rev.reveal")}
              </button>
              <div style={{ fontSize: 11, color: "var(--ink-400)" }}>
                {t("rev.revealHint")}
              </div>
            </div>
          )}
        </div>

        {/* Rating row — disabled until revealed */}
        <div style={{ display: "flex", gap: 8 }}>
          {([
            { rating: "hazy"    as const, label: t("rev.rate.hazy"),    hue: 25  },
            { rating: "getting" as const, label: t("rev.rate.getting"), hue: 85  },
            { rating: "solid"   as const, label: t("rev.rate.solid"),   hue: 170 },
            { rating: "teach"   as const, label: t("rev.rate.teach"),   hue: 235 },
          ]).map(b => (
            <button
              key={b.rating}
              onClick={() => onRate(b.rating)}
              disabled={!revealed}
              style={{
                flex: 1, padding: "10px 8px",
                border: `0.5px solid ${revealed ? `oklch(0.75 0.10 ${b.hue} / 0.5)` : "rgba(23,42,82,0.08)"}`,
                background: revealed ? `oklch(0.96 0.04 ${b.hue} / 0.5)` : "rgba(255,255,255,0.35)",
                borderRadius: 10, fontSize: 12, fontWeight: 500,
                cursor: revealed ? "pointer" : "not-allowed",
                fontFamily: "var(--font-ui)",
                color: revealed ? `oklch(0.40 0.10 ${b.hue})` : "var(--ink-400)",
                transition: "all 220ms var(--ease)",
                opacity: revealed ? 1 : 0.55,
              }}
              onMouseEnter={e => {
                if (!revealed) return;
                e.currentTarget.style.background = `oklch(0.98 0.03 ${b.hue} / 0.8)`;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                if (!revealed) return;
                e.currentTarget.style.background = `oklch(0.96 0.04 ${b.hue} / 0.5)`;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Side column — up next */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="glass" style={{ padding: 22, borderRadius: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t("rev.upnext")}</div>
          {upNext.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upNext.map(it => (
                <div key={it.source.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 10,
                  background: "rgba(255,255,255,0.4)",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: `oklch(0.95 0.03 ${it.source.hue})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: `oklch(0.40 0.09 ${it.source.hue})`,
                  }}><Icon name={it.source.type} size={11}/></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 550 }} className="truncate">{it.source.title}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-400)" }}>{it.source.author}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.55 }}>
              {lang === "zh"
                ? "这是今天最后一张卡。"
                : "This is the last card due today."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function lastReviewedLabel(iso: string, lang: "en" | "zh"): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  const days = Math.floor(elapsed / 86_400_000);
  if (lang === "zh") {
    if (days < 1) return "今天复习过";
    if (days === 1) return "昨天复习过";
    return `${days} 天前复习过`;
  }
  if (days < 1) return "reviewed today";
  if (days === 1) return "reviewed yesterday";
  return `reviewed ${days} days ago`;
}
