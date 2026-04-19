"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon, Logo } from "@/components/icons";
import { LangSwitch, Orb, Segmented, Tag, Thumb } from "@/components/primitives";
import { Magnetic, Reveal, Spotlight, TiltCard } from "@/components/interactions";
import { summarize } from "@/lib/api";
import { AuthMenu } from "@/components/auth-menu";
import { useToast } from "@/components/toast";

const MINDLEAF_HANDLE_URL = "https://github.com/ninime09/mindleaf";

const footerLinkStyle: React.CSSProperties = {
  color: "inherit",
  textDecoration: "none",
  background: "transparent",
  border: "none",
  padding: 0,
  fontSize: 12.5,
  fontFamily: "var(--font-ui)",
  cursor: "pointer",
  letterSpacing: "-0.005em",
};

type Mode = "blog" | "podcast" | "video";

export default function Landing() {
  const { t, lang } = useLang();
  const router = useRouter();
  const onEnter = () => router.push("/workspace");

  const handleNav = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (key === "nav.product") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (key === "nav.how") {
      document.getElementById("how-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (key === "nav.notebook") {
      router.push("/notebook");
    } else if (key === "nav.pricing") {
      router.push("/pricing");
    }
  };

  const [mode, setMode] = useState<Mode>("blog");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async () => {
    const value = url.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await summarize({ url: value, type: mode, lang });
      router.push(`/read/${res.source.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setSubmitError(message);
      setSubmitting(false);
    }
  };

  const modes = [
    { value: "blog"    as const, label: t("hero.mode.blog"),    icon: "blog"    as const, hint: t("hero.hint.blog")    },
    { value: "podcast" as const, label: t("hero.mode.podcast"), icon: "podcast" as const, hint: t("hero.hint.podcast") },
    { value: "video"   as const, label: t("hero.mode.video"),   icon: "video"   as const, hint: t("hero.hint.video")   },
  ];
  const current = modes.find(m => m.value === mode)!;

  return (
    <div style={{ position: "relative", zIndex: 2 }}>

      {/* ============ NAV ============ */}
      <nav style={{
        position: "sticky", top: 16, zIndex: 50,
        margin: "16px auto 0", maxWidth: 1240, padding: "0 24px",
      }}>
        <div className="glass-strong" style={{
          display: "flex", alignItems: "center",
          padding: "10px 14px 10px 18px",
          borderRadius: 18, position: "relative",
        }}>
          <Logo size={24}/>
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex", gap: 4,
          }}>
            {["nav.product", "nav.how", "nav.notebook", "nav.pricing"].map(k => (
              <a key={k} href="#" onClick={handleNav(k)} style={{
                padding: "8px 14px", fontSize: 13.5, fontWeight: 450,
                color: "var(--ink-700)", textDecoration: "none", borderRadius: 10,
                transition: "all 200ms var(--ease)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                {t(k)}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <LangSwitch compact/>
            <AuthMenu/>
            <Magnetic strength={0.3}>
              <button className="btn btn-primary pressable" onClick={onEnter} style={{ padding: "8px 16px", fontSize: 13 }}>
                {t("nav.start")} <Icon name="arrow" size={14}/>
              </button>
            </Magnetic>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <Spotlight color="oklch(0.84 0.10 240 / 0.35)" size={620}>
      <section style={{
        maxWidth: 1240, margin: "0 auto", padding: "24px 24px 60px",
        position: "relative",
        minHeight: "calc(100vh - 80px)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        textAlign: "center",
      }}>
        <Orb size={500} color="oklch(0.86 0.07 235)" style={{ top: -100, left: -100 }}/>
        <Orb size={420} color="oklch(0.87 0.06 215)" style={{ top: 40, right: -120 }}/>

        <div className="reveal" style={{ animationDelay: "80ms" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <span className="chip"><span className="chip-dot"/>{t("hero.beta")}</span>
            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>·</span>
            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{t("hero.audience")}</span>
          </div>
        </div>

        <h1 className="display reveal" style={{
          fontSize: "clamp(40px, 5.5vw, 72px)",
          margin: "0 0 28px",
          maxWidth: 1180,
          animationDelay: "160ms",
        }}>
          {t("hero.title.a")} <em style={{ color: "var(--accent-deep)", fontStyle: "italic" }}>{t("hero.title.em")}</em>
          <br/>{t("hero.title.b")}
        </h1>

        <p className="reveal" style={{
          fontSize: 19, lineHeight: 1.55,
          color: "var(--ink-500)", maxWidth: 580, margin: "0 auto 48px",
          letterSpacing: "-0.005em",
          animationDelay: "240ms",
        }}>
          {t("hero.sub")}
        </p>

        {/* ============ INPUT CARD ============ */}
        <div className="reveal input-card-wrap" style={{
          maxWidth: 780, width: "100%", margin: "0 auto",
          animationDelay: "320ms",
          position: "relative",
        }}>
          <div className="input-card-halo" aria-hidden="true"/>

          <div className="glass-strong input-card" style={{
            padding: 18, borderRadius: 24,
            position: "relative",
            textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Segmented
                value={mode}
                onChange={setMode}
                options={modes.map(m => ({ value: m.value, label: m.label, icon: m.icon }))}
              />
              <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>
                <span className="mono">⌘K</span> {t("hero.quickadd")}
              </span>
            </div>

            <div className="input-row" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "14px 16px",
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(23,42,82,0.08)",
              borderRadius: 14,
              position: "relative",
              overflow: "hidden",
            }}>
              <Icon name={current.icon} size={18} className="no-select" style={{ position: "relative", color: "var(--accent-deep)" }}/>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submit(); }}
                placeholder={current.hint}
                disabled={submitting}
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontSize: 15, fontFamily: "var(--font-ui)", color: "var(--ink-900)",
                  letterSpacing: "-0.005em",
                  position: "relative",
                }}
              />
              <Magnetic strength={0.3}>
                <button className="btn btn-primary pressable" onClick={submit}
                  disabled={submitting || !url.trim()}
                  style={{
                    padding: "9px 18px", fontSize: 13, position: "relative",
                    opacity: (submitting || !url.trim()) ? 0.6 : 1,
                    cursor: (submitting || !url.trim()) ? "not-allowed" : "pointer",
                  }}>
                  {submitting
                    ? <><span className="ml-spinner" aria-hidden/> {lang === "zh" ? "整理中…" : "Summarizing…"}</>
                    : <><Icon name="sparkle" size={14}/> {t("hero.summarize")}</>}
                </button>
              </Magnetic>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-400)", marginRight: 4 }}>{t("hero.try")}</span>
              {[
                "Andrej Karpathy — on LLMs",
                "Lex Fridman ep. 412",
                "3Blue1Brown — transformers",
                "Gwern: scaling hypothesis",
              ].map(tt => (
                <button key={tt} className="chip" style={{ cursor: "pointer", fontFamily: "var(--font-ui)" }}
                  onClick={() => setUrl(tt)}>
                  {tt}
                </button>
              ))}
            </div>

            {submitError && (
              <div role="alert" style={{
                marginTop: 14, padding: "10px 14px",
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
        </div>
      </section>
      </Spotlight>

      {/* ============ PREVIEW / BENTO ============ */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 24px" }}>
        <Reveal>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 32 }}>
          <div>
            <div className="eyebrow">{t("bento.eyebrow")}</div>
            <h2 className="display" style={{ fontSize: "clamp(38px, 4.2vw, 56px)", margin: "12px 0 0", maxWidth: 720, lineHeight: 1.1, wordBreak: "keep-all", overflowWrap: "break-word" }}>
              {t("bento.title.a")} <em style={{ fontStyle: "italic", color: "var(--accent-deep)", whiteSpace: "nowrap" }}>{t("bento.title.em")}{t("bento.title.b")}</em>
            </h2>
          </div>
          <p style={{ color: "var(--ink-500)", maxWidth: 360, fontSize: 15, lineHeight: 1.55, margin: 0 }}>
            {t("bento.sub")}
          </p>
        </div>
        </Reveal>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr 1fr",
          gridTemplateRows: "auto auto",
          gap: 18,
        }}>
          {/* Big card: Summary */}
          <Reveal delay={60} style={{ gridRow: "span 2" }}>
          <TiltCard max={4} className="glass" style={{
            padding: 26,
            display: "flex", flexDirection: "column", gap: 16,
            height: "100%",
            borderRadius: "var(--r-xl)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "oklch(0.94 0.04 235)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent-deep)",
              }}>
                <Icon name="sparkle" size={16}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 550 }}>{t("bento.summary")}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{t("bento.read")}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Tag color="blue">Machine learning</Tag>
              <Tag color="sage">Fundamentals</Tag>
            </div>

            <h3 className="display" style={{ fontSize: 26, margin: 0, letterSpacing: "-0.015em", lineHeight: 1.15 }}>
              {t("bento.cardTitle")}
            </h3>

            <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-700)", margin: 0 }}>
              {t("bento.p1")}
            </p>

            <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-700)", margin: 0 }}>
              {t("bento.p2.a")}
              <span style={{ background: "oklch(0.93 0.06 85 / 0.6)", padding: "1px 4px", borderRadius: 3 }}> {t("bento.p2.hl")}</span>
              {" "}{t("bento.p2.b")}
            </p>

            <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
              <button className="btn btn-ghost pressable" style={{ fontSize: 12.5, padding: "7px 12px" }}>
                <Icon name="arrow" size={13}/> {t("bento.continue")}
              </button>
              <button className="btn btn-ghost btn-icon pressable"><Icon name="bookmark" size={14}/></button>
              <button className="btn btn-ghost btn-icon pressable"><Icon name="share" size={14}/></button>
            </div>
          </TiltCard>
          </Reveal>

          {/* Key takeaways */}
          <Reveal delay={120}>
          <TiltCard max={4} className="glass" style={{ padding: 22, borderRadius: "var(--r-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Icon name="bolt" size={15} style={{ color: "oklch(0.55 0.12 65)" }}/>
              <div style={{ fontSize: 13, fontWeight: 550 }}>{t("bento.keyTake")}</div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                t("bento.take.1"),
                t("bento.take.2"),
                t("bento.take.3"),
              ].map((tx, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--ink-700)", lineHeight: 1.5 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)", flexShrink: 0, marginTop: 2 }}>
                    0{i + 1}
                  </span>
                  <span>{tx}</span>
                </li>
              ))}
            </ul>
          </TiltCard>
          </Reveal>

          {/* What to remember */}
          <Reveal delay={180}>
          <TiltCard max={4} className="glass" style={{ padding: 22, borderRadius: "var(--r-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Icon name="brain" size={15} style={{ color: "oklch(0.48 0.10 295)" }}/>
              <div style={{ fontSize: 13, fontWeight: 550 }}>{t("bento.remember")}</div>
            </div>
            <blockquote className="display" style={{
              margin: 0, fontSize: 18, lineHeight: 1.35,
              color: "var(--ink-900)", letterSpacing: "-0.015em",
              fontStyle: "italic",
            }}>
              {t("bento.remember.q")}
            </blockquote>
            <div style={{ marginTop: 14, fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>
              {t("bento.reviewSched")}
            </div>
          </TiltCard>
          </Reveal>

          {/* Personal notes */}
          <Reveal delay={240}>
          <TiltCard max={4} className="glass" style={{ padding: 22, borderRadius: "var(--r-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Icon name="notebook" size={15} style={{ color: "oklch(0.50 0.08 170)" }}/>
              <div style={{ fontSize: 13, fontWeight: 550 }}>{t("bento.notes")}</div>
              <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--ink-400)" }}>{t("bento.notes.just")}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-700)" }}>
              {t("bento.notes.body.a")} <u style={{ textDecorationColor: "var(--accent)", textDecorationThickness: 1.5, textUnderlineOffset: 2 }}>{t("bento.notes.body.link")}</u>{" "}{t("bento.notes.body.b")}
            </div>
          </TiltCard>
          </Reveal>

          {/* Highlights */}
          <Reveal delay={300}>
          <TiltCard max={4} className="glass" style={{ padding: 22, borderRadius: "var(--r-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Icon name="highlight" size={15} style={{ color: "oklch(0.60 0.12 65)" }}/>
              <div style={{ fontSize: 13, fontWeight: 550 }}>{t("bento.hls")}</div>
              <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--ink-400)" }}>3</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                t("bento.hl.1"),
                t("bento.hl.2"),
              ].map((tx, i) => (
                <div key={i} style={{
                  padding: "8px 10px",
                  borderLeft: "2px solid oklch(0.75 0.12 65)",
                  background: "oklch(0.97 0.03 75 / 0.4)",
                  fontSize: 12.5, color: "var(--ink-700)", lineHeight: 1.5,
                  borderRadius: "0 6px 6px 0",
                }}>{tx}</div>
              ))}
            </div>
          </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-section" style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 24px" }}>
        <Reveal>
        <div className="eyebrow" style={{ textAlign: "center" }}>{t("how.eyebrow")}</div>
        <h2 className="display" style={{ fontSize: 56, textAlign: "center", margin: "12px 0 56px", letterSpacing: "-0.02em" }}>
          {t("how.title")}
        </h2>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { n: "01", ti: t("how.1.t"), d: t("how.1.d"), icon: "link" as const },
            { n: "02", ti: t("how.2.t"), d: t("how.2.d"), icon: "sparkle" as const },
            { n: "03", ti: t("how.3.t"), d: t("how.3.d"), icon: "notebook" as const },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
            <TiltCard max={5} className="glass" style={{
              padding: 28,
              display: "flex", flexDirection: "column", gap: 14,
              minHeight: 220,
              borderRadius: "var(--r-xl)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-400)" }}>{s.n}</span>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "oklch(0.94 0.04 235 / 0.7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--accent-deep)",
                }}><Icon name={s.icon} size={16}/></div>
              </div>
              <h3 className="display" style={{ fontSize: 26, margin: 0, letterSpacing: "-0.015em" }}>{s.ti}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-500)", margin: 0 }}>{s.d}</p>
            </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ NOTEBOOK PREVIEW ============ */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div className="eyebrow">{t("nb.eyebrow")}</div>
            <h2 className="display" style={{ fontSize: 54, margin: "12px 0 20px", letterSpacing: "-0.02em" }}>
              {t("nb.title.a")}<br/>{t("nb.title.b")} <em style={{ fontStyle: "italic", color: "var(--accent-deep)" }}>{t("nb.title.em")}</em>{t("nb.title.end")}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-500)", marginBottom: 28 }}>
              {t("nb.sub")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                [t("nb.feat.1.t"), t("nb.feat.1.d")],
                [t("nb.feat.2.t"), t("nb.feat.2.d")],
                [t("nb.feat.3.t"), t("nb.feat.3.d")],
              ].map(([tt, dd]) => (
                <div key={tt} style={{ display: "flex", gap: 14 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7,
                    background: "oklch(0.93 0.05 235)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--accent-deep)", flexShrink: 0, marginTop: 2,
                  }}><Icon name="check" size={14}/></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 550 }}>{tt}</div>
                    <div style={{ fontSize: 13.5, color: "var(--ink-500)", lineHeight: 1.5 }}>{dd}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <NotebookStack
            cards={[
              { top: 30,  left: 20, rot: -3, z: 1, title: t("nb.card.1"), tag: t("nb.card.1.tag") },
              { top: 70,  left: 90, rot:  2, z: 2, title: t("nb.card.2"), tag: t("nb.card.2.tag") },
              { top: 140, left: 40, rot: -1, z: 3, title: t("nb.card.3"), tag: t("nb.card.3.tag") },
            ]}
            meta={t("nb.card.meta")}
          />
        </div>
      </section>

      {/* ============ CTA ============ */}
      <CtaSection onEnter={onEnter}/>
    </div>
  );
}

/* ------------------- Notebook stack with cursor parallax ------------------- */
type StackCard = { top: number; left: number; rot: number; z: number; title: string; tag: string };

function NotebookStack({ cards, meta }: { cards: StackCard[]; meta: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(pointer: coarse)").matches) return;
    let raf = 0, x = 0, y = 0, tx = 0, ty = 0;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const tick = () => {
      x = x + (tx - x) * 0.08;
      y = y + (ty - y) * 0.08;
      const nodes = el.querySelectorAll<HTMLElement>("[data-card]");
      nodes.forEach((n, i) => {
        const depth = (i + 1) * 8;
        const rot = parseFloat(n.dataset.rot || "0");
        n.style.transform =
          `translate3d(${x * depth}px, ${y * depth}px, 0) rotate(${rot + x * 1.5}deg)`;
      });
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", height: 480 }}>
      {cards.map((c, i) => (
        <div key={i} data-card data-rot={c.rot} className="glass-strong" style={{
          position: "absolute", top: c.top, left: c.left, width: 360,
          transform: `rotate(${c.rot}deg)`,
          zIndex: c.z, padding: 20,
          transition: "box-shadow 400ms var(--ease)",
          willChange: "transform",
        }}>
          <Thumb label={`// ${c.tag}`} h={90} hue={235 + i * 20}/>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="display" style={{ fontSize: 19, letterSpacing: "-0.015em" }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 }}>{meta}</div>
            </div>
            <Icon name="bookmark" size={15} style={{ color: "var(--ink-400)" }}/>
          </div>
        </div>
      ))}
      <Orb size={360} color="oklch(0.86 0.07 235)" style={{ top: 100, right: -40 }}/>
    </div>
  );
}

function CtaSection({ onEnter }: { onEnter: () => void }) {
  const { t } = useLang();
  const { push: pushToast } = useToast();
  const onComingPage = () => pushToast(t("toast.pageSoon"), { kind: "info" });
  return (
    <section style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 24px 120px" }}>
      <Reveal>
      <Spotlight color="oklch(0.84 0.10 245 / 0.40)" size={700}>
      <div className="glass-strong" style={{
        padding: "80px 60px", borderRadius: 32, textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <Orb size={500} color="oklch(0.85 0.08 235)" style={{ top: -200, left: "30%" }}/>
        <h2 className="display" style={{ fontSize: 76, margin: "0 0 20px", letterSpacing: "-0.025em", position: "relative" }}>
          {t("cta.title.a")}<br/>{t("cta.title.b")}
        </h2>
        <p style={{ fontSize: 17, color: "var(--ink-500)", margin: "0 0 36px", maxWidth: 500, marginInline: "auto", lineHeight: 1.55, position: "relative" }}>
          {t("cta.sub")}
        </p>
        <div style={{ display: "inline-flex", gap: 10, position: "relative" }}>
          <Magnetic strength={0.35}>
            <button className="btn btn-primary pressable" onClick={onEnter} style={{ padding: "14px 24px", fontSize: 14 }}>
              {t("cta.open")} <Icon name="arrow" size={15}/>
            </button>
          </Magnetic>
        </div>
      </div>
      </Spotlight>
      </Reveal>

      <footer style={{
        marginTop: 48, display: "flex", justifyContent: "space-between",
        alignItems: "center", paddingTop: 24,
        borderTop: "0.5px solid rgba(23,42,82,0.08)",
      }}>
        <Logo size={20}/>
        <div style={{ display: "flex", gap: 24, fontSize: 12.5, color: "var(--ink-500)" }}>
          <button onClick={onComingPage} style={footerLinkStyle}>Privacy</button>
          <button onClick={onComingPage} style={footerLinkStyle}>Terms</button>
          <button onClick={onComingPage} style={footerLinkStyle}>Manifesto</button>
          <a href={MINDLEAF_HANDLE_URL} target="_blank" rel="noreferrer" style={{ ...footerLinkStyle, background: "transparent", border: "none", padding: 0 }}>@mindleaf</a>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-400)" }}>© 2026 Mindleaf</div>
      </footer>
    </section>
  );
}
