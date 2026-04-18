"use client";

import { Icon } from "./icons";
import { useLang } from "@/lib/i18n/context";
import { useTweaks } from "@/lib/tweaks/context";

export function TweaksButton() {
  const { open, setOpen } = useTweaks();
  return (
    <button
      onClick={() => setOpen(!open)}
      aria-label="Toggle tweaks"
      className="glass-strong pressable"
      style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 99,
        width: 40, height: 40, borderRadius: 12,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "var(--ink-700)",
      }}>
      <Icon name="settings" size={16}/>
    </button>
  );
}

export function TweaksPanel() {
  const { tweaks, setTweak, open, setOpen } = useTweaks();
  const { t } = useLang();
  if (!open) return null;

  const hues = [
    { l: "Misty",  v: 235 },
    { l: "Ocean",  v: 215 },
    { l: "Violet", v: 275 },
    { l: "Sage",   v: 170 },
    { l: "Sand",   v: 65  },
    { l: "Rose",   v: 20  },
  ];
  const fonts = ["Instrument Serif", "Fraunces", "Georgia", "Iowan Old Style"];

  return (
    <div className="glass-strong" style={{
      position: "fixed", bottom: 72, right: 20, width: 280,
      padding: 18, borderRadius: 18, zIndex: 101,
      boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 0.5px rgba(23,42,82,0.08), 0 20px 50px -16px rgba(23,42,82,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{t("tw.title")}</div>
        <button onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }}>
          <Icon name="x" size={11}/>
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{t("tw.hue")}</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {hues.map(h => (
            <button key={h.v} onClick={() => setTweak("accentHue", h.v)}
              title={h.l}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: tweaks.accentHue === h.v ? "2px solid var(--ink-900)" : "0.5px solid rgba(23,42,82,0.15)",
                background: `linear-gradient(135deg, oklch(0.78 0.08 ${h.v}), oklch(0.48 0.10 ${h.v}))`,
                cursor: "pointer", padding: 0,
                transition: "transform 200ms var(--ease)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}/>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{t("tw.font")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {fonts.map(f => (
            <button key={f} onClick={() => setTweak("displayFont", f)}
              style={{
                padding: "8px 12px", textAlign: "left",
                border: "0.5px solid rgba(23,42,82,0.08)",
                background: tweaks.displayFont === f ? "oklch(0.93 0.05 235)" : "rgba(255,255,255,0.5)",
                borderRadius: 8, cursor: "pointer",
                fontSize: 14, fontFamily: `"${f}", Georgia, serif`,
                color: tweaks.displayFont === f ? "var(--accent-deep)" : "var(--ink-700)",
                fontWeight: tweaks.displayFont === f ? 550 : 400,
                letterSpacing: "-0.01em",
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 4 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-700)" }}>
          {t("tw.motion")}
          <input type="checkbox" checked={tweaks.ambientMotion}
            onChange={e => setTweak("ambientMotion", e.target.checked)}
            style={{ accentColor: "var(--accent-deep)" }}/>
        </label>
      </div>
    </div>
  );
}
