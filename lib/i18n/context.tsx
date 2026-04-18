"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DICT, translate, type Lang, type TKey } from "./dict";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey | string) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mindleaf.lang");
      if (saved === "en" || saved === "zh") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLangState(saved);
      }
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("mindleaf.lang", l); } catch {}
  }, []);

  const t = useCallback((key: TKey | string) => translate(key, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

export { DICT };
