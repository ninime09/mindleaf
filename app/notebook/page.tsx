"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon, Logo } from "@/components/icons";
import { LangSwitch, Progress, Segmented } from "@/components/primitives";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteSource, listSources, type Source } from "@/lib/api";

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

  useEffect(() => {
    let cancelled = false;
    listSources().then(s => {
      if (cancelled) return;
      setSources(s);
    });
    return () => { cancelled = true; };
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
            3 <span style={{ fontSize: 13, color: "var(--ink-500)", fontFamily: "var(--font-ui)" }}>/ 9 {t("nbp.rev.due")}</span>
          </div>
          <Progress value={3/9}/>
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "7px 12px", marginTop: 12 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="glass" style={{ padding: 32, borderRadius: 22, display: "flex", flexDirection: "column", gap: 20, minHeight: 420 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="eyebrow">Review · card 1 of 3</span>
                <Progress value={1/3}/>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 6 }}>
                  <Icon name="video" size={12} style={{ verticalAlign: -2, marginRight: 5 }}/>
                  3Blue1Brown · reviewed 4 days ago
                </div>
                <h3 className="display" style={{ fontSize: 32, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  What is a transformer, really?
                </h3>
              </div>

              <div style={{
                padding: 20, borderRadius: 16,
                background: "linear-gradient(180deg, oklch(0.95 0.03 235 / 0.7), oklch(0.97 0.02 235 / 0.3))",
                border: "0.5px solid rgba(23,42,82,0.06)",
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <blockquote className="display" style={{
                  margin: 0, fontSize: 22, lineHeight: 1.3, textAlign: "center",
                  color: "var(--ink-900)", fontStyle: "italic", letterSpacing: "-0.015em",
                }}>
                  &ldquo;Attention lets a model weigh every part of the input against every other — all at once.&rdquo;
                </blockquote>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "Still hazy" },
                  { label: "Getting it" },
                  { label: "Solid"      },
                  { label: "Teach it"   },
                ].map(b => (
                  <button key={b.label} style={{
                    flex: 1, padding: "10px 8px",
                    border: "0.5px solid rgba(23,42,82,0.08)",
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: 10, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "var(--font-ui)",
                    color: "var(--ink-700)",
                    transition: "all 220ms var(--ease)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.6)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="glass" style={{ padding: 22, borderRadius: 18 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Up next in review</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.slice(1, 4).map(c => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 10,
                      background: "rgba(255,255,255,0.4)",
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: `oklch(0.95 0.03 ${c.hue})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: `oklch(0.40 0.09 ${c.hue})`,
                      }}><Icon name={c.type} size={11}/></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 550 }} className="truncate">{c.title}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-400)" }}>{c.author}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass" style={{ padding: 22, borderRadius: 18 }}>
                <div className="eyebrow" style={{ marginBottom: 14 }}>Retention curve</div>
                <svg viewBox="0 0 300 100" style={{ width: "100%", height: 100, display: "block" }}>
                  <defs>
                    <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="oklch(0.72 0.09 240)" stopOpacity="0.35"/>
                      <stop offset="100%" stopColor="oklch(0.72 0.09 240)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0 20 L40 18 L80 25 L120 35 L160 40 L200 30 L240 25 L280 22 L300 24"
                    stroke="oklch(0.45 0.10 245)" strokeWidth="1.5" fill="none"/>
                  <path d="M0 20 L40 18 L80 25 L120 35 L160 40 L200 30 L240 25 L280 22 L300 24 L300 100 L0 100 Z"
                    fill="url(#retFill)"/>
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-400)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
                  <span>7d</span><span>30d</span><span>90d</span>
                </div>
              </div>
            </div>
          </div>
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
