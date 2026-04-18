"use client";

import { Children, type CSSProperties, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { useLang } from "@/lib/i18n/context";

/* Soft animated blob / orb */
export function Orb({ size = 340, color = "oklch(0.82 0.08 235)", style }: {
  size?: number; color?: string; style?: CSSProperties;
}) {
  return (
    <div style={{
      position: "absolute",
      width: size, height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color}, transparent 65%)`,
      filter: "blur(40px)",
      opacity: 0.6,
      pointerEvents: "none",
      ...style,
    }}/>
  );
}

/* Reveal-on-mount wrapper (staggered children) */
export function Stagger({ children, delay = 0, step = 60, style }: {
  children: ReactNode; delay?: number; step?: number; style?: CSSProperties;
}) {
  const arr = Children.toArray(children);
  return (
    <>
      {arr.map((c, i) => (
        <div key={i} className="reveal" style={{ animationDelay: `${delay + i * step}ms`, ...style }}>
          {c}
        </div>
      ))}
    </>
  );
}

type SegOption<T extends string> = { value: T; label: string; icon?: IconName };

export function Segmented<T extends string>({ options, value, onChange }: {
  options: SegOption<T>[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{
      display: "inline-flex",
      padding: 3,
      background: "rgba(23,42,82,0.05)",
      borderRadius: 999,
      border: "0.5px solid rgba(23,42,82,0.08)",
      position: "relative",
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              border: "none",
              background: active ? "white" : "transparent",
              color: active ? "var(--ink-900)" : "var(--ink-500)",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 260ms var(--ease)",
              boxShadow: active
                ? "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 0.5px rgba(23,42,82,0.08), 0 4px 10px -6px rgba(23,42,82,0.15)"
                : "none",
              fontFamily: "var(--font-ui)",
              letterSpacing: "-0.005em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}>
            {o.icon && <Icon name={o.icon} size={13} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export type TagColor = "neutral" | "blue" | "sage" | "sand" | "rose" | "violet";
const TAG_PALETTE: Record<TagColor, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: "rgba(23,42,82,0.05)",       fg: "var(--ink-700)",        dot: "oklch(0.70 0.02 240)" },
  blue:    { bg: "oklch(0.92 0.05 235 / 0.6)", fg: "oklch(0.36 0.10 245)",  dot: "oklch(0.60 0.10 240)" },
  sage:    { bg: "oklch(0.93 0.04 170 / 0.5)", fg: "oklch(0.38 0.08 175)",  dot: "oklch(0.62 0.08 170)" },
  sand:    { bg: "oklch(0.95 0.04 85 / 0.6)",  fg: "oklch(0.40 0.08 85)",   dot: "oklch(0.68 0.09 85)"  },
  rose:    { bg: "oklch(0.94 0.04 20 / 0.55)", fg: "oklch(0.42 0.10 22)",   dot: "oklch(0.70 0.09 22)"  },
  violet:  { bg: "oklch(0.93 0.05 290 / 0.55)",fg: "oklch(0.40 0.10 290)",  dot: "oklch(0.65 0.09 290)" },
};

export function Tag({ children, color = "neutral", onClick, size = "md" }: {
  children: ReactNode; color?: TagColor; onClick?: () => void; size?: "sm" | "md";
}) {
  const palette = TAG_PALETTE[color];
  const pad = size === "sm" ? "3px 8px" : "4px 10px";
  const fs = size === "sm" ? 10.5 : 11.5;
  return (
    <span onClick={onClick} style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: pad,
      fontSize: fs,
      fontWeight: 500,
      color: palette.fg,
      background: palette.bg,
      border: "0.5px solid rgba(23,42,82,0.06)",
      borderRadius: 999,
      cursor: onClick ? "pointer" : "default",
      letterSpacing: "-0.005em",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: palette.dot }}/>
      {children}
    </span>
  );
}

export function Thumb({ label, h = 120, hue = 235 }: { label: string; h?: number; hue?: number }) {
  return (
    <div style={{
      height: h,
      borderRadius: 12,
      background: `repeating-linear-gradient(135deg, oklch(0.92 0.03 ${hue}) 0 1px, oklch(0.96 0.015 ${hue}) 1px 12px)`,
      border: "0.5px solid rgba(23,42,82,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--ink-500)",
      fontSize: 10.5,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>{label}</div>
  );
}

export function Progress({ value = 0.6, color = "var(--accent-deep)" }: { value?: number; color?: string }) {
  return (
    <div style={{
      height: 4, borderRadius: 999,
      background: "rgba(23,42,82,0.06)",
      overflow: "hidden",
    }}>
      <div style={{
        width: `${value * 100}%`,
        height: "100%",
        background: `linear-gradient(90deg, oklch(0.72 0.08 240), ${color})`,
        borderRadius: 999,
        transition: "width 600ms var(--ease)",
      }}/>
    </div>
  );
}

export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const opts = [
    { v: "en" as const, label: "EN", full: "English" },
    { v: "zh" as const, label: "中",  full: "中文" },
  ];
  return (
    <div style={{
      display: "inline-flex",
      padding: 3,
      background: "rgba(23,42,82,0.05)",
      borderRadius: 999,
      border: "0.5px solid rgba(23,42,82,0.08)",
    }}>
      {opts.map(o => {
        const active = o.v === lang;
        return (
          <button key={o.v} onClick={() => setLang(o.v)}
            title={o.full}
            style={{
              border: "none",
              background: active ? "white" : "transparent",
              color: active ? "var(--ink-900)" : "var(--ink-500)",
              padding: compact ? "4px 10px" : "5px 12px",
              borderRadius: 999,
              fontSize: compact ? 11.5 : 12.5,
              fontWeight: 550,
              cursor: "pointer",
              transition: "all 240ms var(--ease)",
              fontFamily: "var(--font-ui)",
              boxShadow: active
                ? "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 0.5px rgba(23,42,82,0.08), 0 3px 8px -4px rgba(23,42,82,0.15)"
                : "none",
              letterSpacing: o.v === "zh" ? "0" : "0.02em",
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
