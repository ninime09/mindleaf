"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";

export type Tweaks = {
  accentHue: number;
  displayFont: string;
  ambientMotion: boolean;
};

const DEFAULTS: Tweaks = {
  accentHue: 235,
  displayFont: "Iowan Old Style",
  ambientMotion: true,
};

type Ctx = {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const TweaksContext = createContext<Ctx | null>(null);

export function TweaksProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULTS);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mindleaf.tweaks");
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTweaks({ ...DEFAULTS, ...JSON.parse(raw) });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("mindleaf.tweaks", JSON.stringify(tweaks)); } catch {}
  }, [tweaks]);

  /* Accent hue → CSS vars */
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent",      `oklch(0.70 0.09 ${tweaks.accentHue})`);
    r.style.setProperty("--accent-deep", `oklch(0.42 0.10 ${tweaks.accentHue})`);
    r.style.setProperty("--accent-soft", `oklch(0.88 0.04 ${tweaks.accentHue})`);
    r.style.setProperty("--accent-wash", `oklch(0.95 0.02 ${tweaks.accentHue})`);
  }, [tweaks.accentHue]);

  /* Language-aware display font.
     English: use Tweaks-selected serif (Instrument Serif default, via next/font var).
     Chinese: Iowan Old Style (system, macOS) → CJK serif fallbacks, ending at next/font Noto Serif SC. */
  useEffect(() => {
    const r = document.documentElement;
    const enFont = tweaks.displayFont || "Instrument Serif";
    const enStack = enFont === "Instrument Serif"
      ? `var(--font-instrument-serif), Georgia, serif`
      : `"${enFont}", Georgia, serif`;
    const zhStack = `"Iowan Old Style", "Songti SC", "STSong", "Source Han Serif SC", "Noto Serif CJK SC", var(--font-noto-serif-sc), serif`;
    r.style.setProperty("--font-display", lang === "zh" ? zhStack : enStack);
    r.lang = lang === "zh" ? "zh-CN" : "en";
  }, [tweaks.displayFont, lang]);

  /* Ambient motion toggle */
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !tweaks.ambientMotion);
  }, [tweaks.ambientMotion]);

  const setTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks(t => ({ ...t, [key]: value }));
  };

  return (
    <TweaksContext.Provider value={{ tweaks, setTweak, open, setOpen }}>
      {children}
    </TweaksContext.Provider>
  );
}

export function useTweaks() {
  const ctx = useContext(TweaksContext);
  if (!ctx) throw new Error("useTweaks must be used within TweaksProvider");
  return ctx;
}
