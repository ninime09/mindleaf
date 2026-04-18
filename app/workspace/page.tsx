"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon, Logo } from "@/components/icons";
import { LangSwitch, Progress, Segmented, Tag, type TagColor } from "@/components/primitives";
import type { IconName } from "@/components/icons";

type Tab = "summary" | "takeaways" | "explain" | "transcript";
type SourceType = "blog" | "podcast" | "video";

const DETAIL_PATH = "/read/designing-calm-software";

export default function Dashboard() {
  const router = useRouter();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [sourceType, setSourceType] = useState<SourceType>("video");

  const onOpen = () => router.push(DETAIL_PATH);

  const nav: { id: string; label: string; icon: IconName; active?: boolean; go?: () => void }[] = [
    { id: "home",      label: t("dash.nav.home"),     icon: "home",     go: () => router.push("/") },
    { id: "dashboard", label: t("dash.nav.work"),     icon: "sparkle",  active: true },
    { id: "notebook",  label: t("dash.nav.notebook"), icon: "notebook", go: () => router.push("/notebook") },
    { id: "review",    label: t("dash.nav.review"),   icon: "brain" },
    { id: "archive",   label: t("dash.nav.archive"),  icon: "archive" },
  ];

  const collections = [
    { name: t("dash.col.ml"),     count: 14, color: "blue"   },
    { name: t("dash.col.phil"),   count: 8,  color: "violet" },
    { name: t("dash.col.design"), count: 6,  color: "sage"   },
    { name: t("dash.col.team"),   count: 4,  color: "sand"   },
  ];

  const history: { t: string; sub: string; time: string; type: IconName; prog: number }[] = [
    { t: t("dash.hist.1.t"), sub: t("dash.hist.1.s"), time: t("dash.time.2h"), type: "podcast", prog: 1.0 },
    { t: t("dash.hist.2.t"), sub: t("dash.hist.2.s"), time: t("dash.time.y"),  type: "blog",    prog: 1.0 },
    { t: t("dash.hist.3.t"), sub: t("dash.hist.3.s"), time: t("dash.time.2d"), type: "video",   prog: 0.7 },
    { t: t("dash.hist.4.t"), sub: t("dash.hist.4.s"), time: t("dash.time.3d"), type: "blog",    prog: 1.0 },
  ];

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
      {/* SIDEBAR */}
      <aside className="glass-strong" style={{
        padding: 18, borderRadius: 22,
        display: "flex", flexDirection: "column", gap: 18,
        overflow: "hidden",
      }}>
        <div style={{ padding: "4px 6px" }}>
          <Logo size={22}/>
        </div>

        <button className="btn btn-primary" style={{ justifyContent: "center", padding: "10px 16px", fontSize: 13 }}>
          <Icon name="plus" size={14}/> {t("dash.new")}
        </button>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => n.go?.()} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px",
              border: "none",
              background: n.active ? "rgba(255,255,255,0.7)" : "transparent",
              boxShadow: n.active ? "0 0 0 0.5px rgba(23,42,82,0.06), 0 1px 2px rgba(23,42,82,0.04)" : "none",
              borderRadius: 10,
              color: n.active ? "var(--ink-900)" : "var(--ink-500)",
              fontSize: 13, fontWeight: n.active ? 550 : 450,
              cursor: "pointer", textAlign: "left",
              fontFamily: "var(--font-ui)", letterSpacing: "-0.005em",
              transition: "all 200ms var(--ease)",
            }}>
              <Icon name={n.icon} size={15}/>
              {n.label}
            </button>
          ))}
        </nav>

        <div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 8px", marginBottom: 6,
          }}>
            <span className="eyebrow" style={{ fontSize: 10.5 }}>{t("dash.col")}</span>
            <button style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-400)", padding: 2 }}>
              <Icon name="plus" size={13}/>
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {collections.map(c => (
              <button key={c.name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 10px", border: "none", background: "transparent",
                borderRadius: 8, color: "var(--ink-700)",
                fontSize: 12.5, cursor: "pointer", textAlign: "left",
                fontFamily: "var(--font-ui)",
                transition: "all 160ms var(--ease)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <Icon name="folder" size={13} style={{ color: "var(--ink-400)" }}/>
                <span style={{ flex: 1, textAlign: "left" }}>{c.name}</span>
                <span style={{ fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", padding: 12, borderRadius: 14,
          background: "linear-gradient(180deg, oklch(0.94 0.04 235 / 0.7), oklch(0.96 0.02 235 / 0.5))",
          border: "0.5px solid rgba(23,42,82,0.06)",
        }}>
          <div style={{ fontSize: 11, color: "var(--ink-500)", marginBottom: 6 }}>{t("dash.streak")}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
            <span className="display" style={{ fontSize: 28, color: "var(--accent-deep)" }}>14</span>
            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{t("dash.days")}</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 22,
                borderRadius: 3,
                background: i < 12
                  ? `oklch(${0.55 + i * 0.02} 0.09 240)`
                  : "rgba(23,42,82,0.08)",
              }}/>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px 0" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, oklch(0.72 0.09 240), oklch(0.55 0.10 250))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 12, fontWeight: 600,
          }}>MK</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 550 }} className="truncate">Maya Kern</div>
            <div style={{ fontSize: 11, color: "var(--ink-400)" }} className="truncate">{t("dash.plan")}</div>
          </div>
          <Icon name="settings" size={14} style={{ color: "var(--ink-400)" }}/>
        </div>
      </aside>

      {/* CENTER */}
      <main style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
        <div className="glass-strong" style={{
          padding: "10px 14px", borderRadius: 16,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="search" size={15} style={{ color: "var(--ink-400)", marginLeft: 4 }}/>
          <input placeholder={t("dash.search")}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 13.5, fontFamily: "var(--font-ui)",
              color: "var(--ink-900)", letterSpacing: "-0.005em",
            }}/>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-400)" }}>⌘K</span>
          <div style={{ width: 1, height: 18, background: "rgba(23,42,82,0.1)" }}/>
          <LangSwitch compact/>
          <button className="btn btn-ghost btn-icon"><Icon name="filter" size={14}/></button>
          <button className="btn btn-ghost btn-icon"><Icon name="clock" size={14}/></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "auto", paddingRight: 4 }}>
          <div style={{ padding: "8px 4px" }}>
            <div className="eyebrow">{t("dash.greet.day")}</div>
            <h1 className="display" style={{ fontSize: 44, margin: "6px 0 0", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {t("dash.greet")}
            </h1>
            <p style={{ fontSize: 14.5, color: "var(--ink-500)", marginTop: 14 }}>
              {t("dash.status.a")} <span style={{ color: "var(--accent-deep)", fontWeight: 550 }}>{t("dash.status.n")}</span> {t("dash.status.b")}
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
              <input placeholder={t("dash.paste")}
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontSize: 14, fontFamily: "var(--font-ui)", color: "var(--ink-900)",
                }}/>
              <button className="btn btn-primary" onClick={onOpen} style={{ fontSize: 12.5, padding: "7px 14px" }}>
                {t("dash.summarize")} <Icon name="arrow" size={13}/>
              </button>
            </div>
          </div>

          {/* Currently summarizing */}
          <div className="glass" style={{ padding: 24, borderRadius: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "oklch(0.94 0.04 235)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--accent-deep)",
                }}><Icon name="video" size={17}/></div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {t("dash.current")}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 550 }}>{t("dash.current.t")}</div>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={onOpen} style={{ fontSize: 12, padding: "6px 12px" }}>
                {t("dash.open")} <Icon name="arrow" size={12}/>
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14, borderBottom: "0.5px solid rgba(23,42,82,0.08)" }}>
              {([
                { id: "summary",    label: t("dash.tab.sum") },
                { id: "takeaways",  label: t("dash.tab.take") },
                { id: "explain",    label: t("dash.tab.explain") },
                { id: "transcript", label: t("dash.tab.trans") },
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
                <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-700)" }}>
                  <p style={{ marginTop: 0 }}>
                    {t("dash.summ.p1")}
                  </p>
                  <p>
                    {t("dash.summ.p2.a")} <em>{t("dash.summ.p2.em")}</em> {t("dash.summ.p2.b")}
                    <span style={{ background: "oklch(0.93 0.06 85 / 0.5)", padding: "1px 4px", borderRadius: 3 }}> {t("dash.summ.p2.hl")}</span>
                    {t("dash.summ.p2.c")}
                  </p>
                </div>
              )}
              {activeTab === "takeaways" && (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[t("dash.take.1"), t("dash.take.2"), t("dash.take.3"), t("dash.take.4")].map((tx, i) => (
                    <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, color: "var(--ink-700)" }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>0{i + 1}</span>
                      <span>{tx}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === "explain" && (
                <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-700)" }}>
                  {t("dash.explain")}
                </div>
              )}
              {activeTab === "transcript" && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-500)" }}>
                  {t("dash.trans.1")}<br/>
                  {t("dash.trans.2")}<br/>
                  {t("dash.trans.3")}
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <Progress value={0.72}/>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--ink-400)" }}>
                <span>{t("dash.progress")}</span>
                <span>{t("dash.sections")}</span>
              </div>
            </div>
          </div>

          {/* Recent history */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 10px" }}>
              <div className="eyebrow">{t("dash.recent")}</div>
              <button style={{ background: "none", border: "none", color: "var(--ink-500)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-ui)" }}>
                {t("dash.seeAll")} <Icon name="chevron" size={11} style={{ verticalAlign: -1 }}/>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {history.map((h, i) => (
                <div key={i} className="glass" onClick={onOpen} style={{
                  padding: 16, borderRadius: 14, cursor: "pointer",
                  transition: "all 280ms var(--ease)",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: "oklch(0.95 0.03 235)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--ink-500)",
                    }}><Icon name={h.type} size={13}/></div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-400)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {h.type} · {h.time}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 550, marginBottom: 4, letterSpacing: "-0.005em" }}>
                    {h.t}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 12 }} className="truncate">
                    {h.sub}
                  </div>
                  <Progress value={h.prog}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="glass-strong" style={{
        padding: 18, borderRadius: 22, overflow: "auto",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="eyebrow">{t("dash.right.notes")}</span>
            <Icon name="plus" size={14} style={{ color: "var(--ink-400)", cursor: "pointer" }}/>
          </div>
          <textarea
            defaultValue={t("dash.right.note")}
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {([
              { c: "sand", t: t("dash.right.hl.1"), ts: "04:12", hue: 85  },
              { c: "blue", t: t("dash.right.hl.2"), ts: "08:47", hue: 235 },
              { c: "sage", t: t("dash.right.hl.3"), ts: "12:03", hue: 170 },
            ] as const).map((h, i) => (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 10,
                background: `oklch(0.96 0.03 ${h.hue} / 0.55)`,
                borderLeft: `2px solid oklch(0.70 0.1 ${h.hue})`,
                fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-700)",
              }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-400)", marginBottom: 3 }}>
                  @ {h.ts}
                </div>
                &ldquo;{h.t}&rdquo;
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t("dash.right.tags")}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {([
              { c: "blue",   t: "design" },
              { c: "violet", t: "attention" },
              { c: "sage",   t: "product" },
              { c: "sand",   t: "craft" },
              { c: "rose",   t: "to-revisit" },
            ] as { c: TagColor; t: string }[]).map(tg => <Tag key={tg.t} color={tg.c}>{tg.t}</Tag>)}
            <Tag>{t("dash.right.addTag")}</Tag>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t("dash.right.conn")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              t("dash.right.conn.1"),
              t("dash.right.conn.2"),
              t("dash.right.conn.3"),
            ].map(tx => (
              <a key={tx} href="#" style={{
                fontSize: 12.5, color: "var(--ink-700)", textDecoration: "none",
                padding: "8px 10px", borderRadius: 8,
                display: "flex", alignItems: "center", gap: 8,
                transition: "all 200ms var(--ease)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <Icon name="link" size={12} style={{ color: "var(--ink-400)" }}/>
                <span className="truncate">{tx}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="glass-weak" style={{ padding: 14, borderRadius: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="brain" size={13} style={{ color: "oklch(0.48 0.10 295)" }}/>
            <span style={{ fontSize: 12, fontWeight: 550 }}>{t("dash.right.rev")}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5, marginBottom: 10 }}>
            {t("dash.right.rev.d")}
          </div>
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 12, padding: "7px 12px" }}>
            {t("dash.right.rev.b")}
          </button>
        </div>
      </aside>
    </div>
  );
}
