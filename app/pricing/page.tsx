"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon, Logo } from "@/components/icons";
import { LangSwitch, Orb } from "@/components/primitives";
import { Magnetic, Reveal, Spotlight } from "@/components/interactions";

type TierId = "seedling" | "reader" | "studio";

type Tier = {
  id: TierId;
  name: string;
  tag: string;
  priceM: number;
  priceY: number;
  cta: string;
  ctaGhost?: boolean;
  highlight?: boolean;
  features: string[];
};

export default function Pricing() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [annual, setAnnual] = useState(true);

  const onEnter = () => router.push("/workspace");

  const handleNav = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (key === "nav.product") {
      router.push("/");
    } else if (key === "nav.how") {
      router.push("/#how-section");
    } else if (key === "nav.notebook") {
      router.push("/notebook");
    } else if (key === "nav.pricing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const tiers: Tier[] = [
    {
      id: "seedling",
      name: t("price.seedling.name"),
      tag:  t("price.seedling.tag"),
      priceM: 0, priceY: 0,
      cta:  t("price.seedling.cta"),
      ctaGhost: true,
      features: [
        t("price.seedling.f1"),
        t("price.seedling.f2"),
        t("price.seedling.f3"),
        t("price.seedling.f4"),
      ],
    },
    {
      id: "reader",
      name: t("price.reader.name"),
      tag:  t("price.reader.tag"),
      priceM: 12, priceY: 9,
      cta:  t("price.reader.cta"),
      highlight: true,
      features: [
        t("price.reader.f1"),
        t("price.reader.f2"),
        t("price.reader.f3"),
        t("price.reader.f4"),
        t("price.reader.f5"),
        t("price.reader.f6"),
      ],
    },
    {
      id: "studio",
      name: t("price.studio.name"),
      tag:  t("price.studio.tag"),
      priceM: 32, priceY: 24,
      cta:  t("price.studio.cta"),
      features: [
        t("price.studio.f1"),
        t("price.studio.f2"),
        t("price.studio.f3"),
        t("price.studio.f4"),
        t("price.studio.f5"),
        t("price.studio.f6"),
      ],
    },
  ];

  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      {/* NAV */}
      <nav style={{
        position: "sticky", top: 16, zIndex: 50,
        margin: "16px auto 0", maxWidth: 1240, padding: "0 24px",
      }}>
        <div className="glass-strong" style={{
          display: "flex", alignItems: "center",
          padding: "10px 14px 10px 18px",
          borderRadius: 18, position: "relative",
        }}>
          <a href="#" onClick={handleNav("nav.product")} style={{ textDecoration: "none", display: "inline-flex" }}>
            <Logo size={24}/>
          </a>
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex", gap: 4,
          }}>
            {["nav.product", "nav.how", "nav.notebook", "nav.pricing"].map(k => (
              <a key={k} href="#" onClick={handleNav(k)} style={{
                padding: "8px 14px", fontSize: 13.5, fontWeight: 450,
                color: k === "nav.pricing" ? "var(--ink-900)" : "var(--ink-700)",
                background: k === "nav.pricing" ? "rgba(23,42,82,0.05)" : "transparent",
                textDecoration: "none", borderRadius: 10,
                transition: "all 200ms var(--ease)",
              }}
              onMouseEnter={e => { if (k !== "nav.pricing") e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
              onMouseLeave={e => { if (k !== "nav.pricing") e.currentTarget.style.background = "transparent"; }}>
                {t(k)}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <LangSwitch compact/>
            <button className="btn btn-ghost pressable" style={{ padding: "8px 14px", fontSize: 13 }}>{t("nav.signin")}</button>
            <Magnetic strength={0.3}>
              <button className="btn btn-primary pressable" onClick={onEnter} style={{ padding: "8px 16px", fontSize: 13 }}>
                {t("nav.start")} <Icon name="arrow" size={14}/>
              </button>
            </Magnetic>
          </div>
        </div>
      </nav>

      {/* HEADER */}
      <Spotlight color="oklch(0.84 0.10 240 / 0.30)" size={560}>
      <section style={{
        maxWidth: 1240, margin: "0 auto", padding: "80px 24px 40px",
        textAlign: "center", position: "relative",
      }}>
        <Orb size={440} color="oklch(0.86 0.07 235)" style={{ top: -60, left: "10%" }}/>
        <Orb size={380} color="oklch(0.87 0.06 215)" style={{ top: 40, right: "8%" }}/>

        <div className="reveal" style={{ animationDelay: "80ms" }}>
          <h1 className="display" style={{
            fontSize: "clamp(48px, 6vw, 88px)", margin: "0 0 20px",
            letterSpacing: "-0.028em", lineHeight: 1, wordBreak: "keep-all",
          }}>
            {t("price.title.a")}{lang === "zh" ? "" : " "}
            <em style={{ fontStyle: "italic", color: "var(--accent-deep)", whiteSpace: "nowrap" }}>{t("price.title.em")}</em>
            {lang === "zh" ? "" : " "}{t("price.title.b")}
          </h1>
          <p style={{
            fontSize: 18, color: "var(--ink-500)", maxWidth: 620,
            margin: "0 auto", lineHeight: 1.55,
          }}>{t("price.sub")}</p>
        </div>

        {/* Billing toggle */}
        <div className="reveal" style={{ marginTop: 40, animationDelay: "160ms", display: "inline-flex", position: "relative" }}>
          <div className="glass-strong" style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            padding: 4, borderRadius: 999, fontSize: 13.5,
          }}>
            <button onClick={() => setAnnual(false)} style={{
              padding: "9px 20px", borderRadius: 999, border: "none",
              background: !annual ? "var(--ink-900)" : "transparent",
              color: !annual ? "var(--bg-paper)" : "var(--ink-600)",
              fontFamily: "inherit", fontWeight: 500, cursor: "pointer",
              transition: "all 200ms var(--ease)",
            }}>{t("price.monthly")}</button>
            <button onClick={() => setAnnual(true)} style={{
              padding: "9px 20px", borderRadius: 999, border: "none",
              background: annual ? "var(--ink-900)" : "transparent",
              color: annual ? "var(--bg-paper)" : "var(--ink-600)",
              fontFamily: "inherit", fontWeight: 500, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all 200ms var(--ease)",
            }}>
              {t("price.yearly")}
              <span style={{
                fontSize: 10.5, padding: "2px 8px", borderRadius: 999,
                background: annual ? "rgba(255,255,255,0.18)" : "oklch(0.9 0.08 145)",
                color: annual ? "var(--bg-paper)" : "oklch(0.38 0.09 150)",
                fontWeight: 600, letterSpacing: "0.02em",
              }}>{t("price.save")}</span>
            </button>
          </div>
        </div>
      </section>
      </Spotlight>

      {/* TIERS */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 24px 80px" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20, alignItems: "stretch",
        }}>
          {tiers.map((tier, i) => {
            const price = annual ? tier.priceY : tier.priceM;
            const note = t(`price.${tier.id}.note`);
            const cardStyle: CSSProperties = {
              height: "100%", padding: 32, borderRadius: 24,
              position: "relative", display: "flex", flexDirection: "column",
              border: tier.highlight ? "1.5px solid var(--accent)" : undefined,
              boxShadow: tier.highlight
                ? "0 20px 60px -20px oklch(0.45 0.14 245 / 0.25), 0 0 0 1px rgba(255,255,255,0.35) inset"
                : undefined,
            };
            return (
              <div key={tier.id} className="reveal" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <div className="glass-strong" style={cardStyle}>
                  {tier.highlight && (
                    <div style={{
                      position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                      padding: "4px 12px", borderRadius: 999, fontSize: 11,
                      background: "var(--accent-deep)", color: "var(--bg-paper)",
                      fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                    }}>{t("price.popular")}</div>
                  )}

                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.015em" }}>
                      {tier.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 4, lineHeight: 1.5 }}>
                      {tier.tag}
                    </div>
                  </div>

                  <div style={{ margin: "28px 0 8px", display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="display" style={{ fontSize: 56, letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {price === 0 ? t("price.free") : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span style={{ fontSize: 14, color: "var(--ink-500)" }}>
                        {lang === "zh" ? "/ 月" : "/mo"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-400)", minHeight: 18 }}>
                    {price > 0 && annual && (lang === "zh"
                      ? `按年付费，每月 $${price}`
                      : `Billed annually · $${price * 12}/yr`)}
                    {price > 0 && !annual && (lang === "zh" ? "按月付费，可随时取消" : "Billed monthly, cancel anytime")}
                    {price === 0 && (lang === "zh" ? "永久免费，无需信用卡" : "Free forever, no card needed")}
                  </div>

                  {note && (
                    <div style={{
                      marginTop: 14, padding: "10px 12px", borderRadius: 10,
                      background: "rgba(23,42,82,0.04)",
                      fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5,
                      fontStyle: "italic",
                    }}>
                      {note}
                    </div>
                  )}

                  <div style={{ margin: "28px 0", height: 1, background: "rgba(23,42,82,0.08)" }}/>

                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                    {tier.features.map((f, j) => (
                      <li key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5, color: "var(--ink-700)" }}>
                        <span style={{
                          flexShrink: 0, marginTop: 3, width: 14, height: 14, borderRadius: 999,
                          background: tier.highlight ? "var(--accent)" : "oklch(0.92 0.02 240)",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.25 5.5L6.5 2.25" stroke={tier.highlight ? "white" : "var(--ink-700)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div style={{ marginTop: 32 }}>
                    <button
                      className={tier.ctaGhost ? "btn btn-ghost pressable" : "btn btn-primary pressable"}
                      onClick={onEnter}
                      style={{
                        width: "100%", padding: "13px 20px", fontSize: 14,
                        justifyContent: "center",
                        ...(tier.ctaGhost ? { border: "1px solid rgba(23,42,82,0.14)" } : {}),
                      }}>
                      {tier.cta}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPARE */}
      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 className="display" style={{ fontSize: 44, margin: 0, letterSpacing: "-0.02em" }}>
              {t("price.compare.title")}
            </h2>
          </div>

          <div className="glass-strong" style={{ borderRadius: 20, overflow: "hidden" }}>
            {([
              { k: "price.cmp.1", a: t("price.cmp.1.free"), b: t("price.cmp.1.reader"), c: t("price.cmp.1.studio") },
              { k: "price.cmp.2", a: "—",                   b: "✓",                     c: "✓" },
              { k: "price.cmp.3", a: "—",                   b: "✓",                     c: "✓" },
              { k: "price.cmp.4", a: "—",                   b: "—",                     c: "✓" },
              { k: "price.cmp.5", a: "—",                   b: "—",                     c: "✓" },
              { k: "price.cmp.6", a: t("price.cmp.6.free"), b: t("price.cmp.6.reader"), c: t("price.cmp.6.studio") },
            ] as { k: string; a: string; b: string; c: string }[]).map((row, i, arr) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                padding: "18px 24px", alignItems: "center",
                borderBottom: i < arr.length - 1 ? "0.5px solid rgba(23,42,82,0.08)" : undefined,
                fontSize: 14,
              }}>
                <div style={{ color: "var(--ink-700)", fontWeight: 500 }}>{t(row.k)}</div>
                <div style={{ color: "var(--ink-500)", textAlign: "center" }}>{row.a}</div>
                <div style={{ color: "var(--ink-700)", textAlign: "center", fontWeight: 500 }}>{row.b}</div>
                <div style={{ color: "var(--ink-700)", textAlign: "center", fontWeight: 500 }}>{row.c}</div>
              </div>
            ))}
            <div style={{
              display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
              padding: "14px 24px", borderTop: "0.5px solid rgba(23,42,82,0.08)",
              background: "rgba(23,42,82,0.02)",
              fontSize: 11.5, color: "var(--ink-400)", textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              <div/>
              <div style={{ textAlign: "center" }}>{t("price.seedling.name")}</div>
              <div style={{ textAlign: "center" }}>{t("price.reader.name")}</div>
              <div style={{ textAlign: "center" }}>{t("price.studio.name")}</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="eyebrow">{t("price.faq.eyebrow")}</div>
            <h2 className="display" style={{ fontSize: 44, margin: "12px 0 0", letterSpacing: "-0.02em" }}>
              {t("price.faq.title")}
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4].map(n => (
              <FaqItem key={n} q={t(`price.faq.${n}.q`)} a={t(`price.faq.${n}.a`)} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 24px 120px" }}>
        <Reveal>
        <Spotlight color="oklch(0.84 0.10 245 / 0.40)" size={600}>
        <div className="glass-strong" style={{
          padding: "60px 48px", borderRadius: 28, textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          <Orb size={400} color="oklch(0.85 0.08 235)" style={{ top: -160, left: "35%" }}/>
          <h2 className="display" style={{ fontSize: 52, margin: "0 0 16px", letterSpacing: "-0.025em", position: "relative" }}>
            {t("price.cta.title")}
          </h2>
          <p style={{ fontSize: 16, color: "var(--ink-500)", margin: "0 0 28px", maxWidth: 480, marginInline: "auto", lineHeight: 1.55, position: "relative" }}>
            {t("price.cta.sub")}
          </p>
          <div style={{ display: "inline-flex", gap: 10, position: "relative" }}>
            <Magnetic strength={0.35}>
              <button className="btn btn-primary pressable" onClick={onEnter} style={{ padding: "14px 24px", fontSize: 14 }}>
                {t("price.cta.start")} <Icon name="arrow" size={15}/>
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
            <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Terms</a>
            <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Manifesto</a>
            <a href="#" style={{ color: "inherit", textDecoration: "none" }}>@mindleaf</a>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-400)" }}>© 2026 Mindleaf</div>
        </footer>
      </section>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-strong" style={{
      borderRadius: 16, padding: "20px 24px",
      transition: "all 240ms var(--ease)",
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "transparent", border: "none", padding: 0, cursor: "pointer",
        fontFamily: "inherit", color: "var(--ink-900)", fontSize: 16, fontWeight: 500,
        textAlign: "left",
      }}>
        <span>{q}</span>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 24, height: 24, borderRadius: 999,
          background: "rgba(23,42,82,0.06)",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 240ms var(--ease)",
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </span>
      </button>
      <div style={{
        maxHeight: open ? 300 : 0, overflow: "hidden",
        transition: "max-height 300ms var(--ease), margin-top 300ms var(--ease)",
        marginTop: open ? 12 : 0,
      }}>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-600)", paddingBottom: 2 }}>
          {a}
        </div>
      </div>
    </div>
  );
}
