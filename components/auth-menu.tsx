"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon } from "./icons";
import { createClient } from "@/lib/supabase/client";

/* Compact auth widget used in nav bars. Shows a "Sign in" button when
   logged out, and an avatar with a small dropdown when logged in. */

type Props = {
  /* If true, the unauthenticated state renders nothing. Useful when
     the parent already shows its own Sign in CTA. */
  hideSignedOut?: boolean;
};

export function AuthMenu({ hideSignedOut }: Props) {
  const router = useRouter();
  const { t, lang } = useLang();
  const [user, setUser] = useState<{ email: string | null; initial: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Subscribe to auth changes so the menu updates immediately when the
     user signs in or out. If env vars aren't set yet, fall back to a
     "no user" state so the app keeps working in the meantime. */
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (cancelled) return;
        setUser(toUser(data.user?.email ?? null));
        setLoaded(true);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        setUser(toUser(session?.user?.email ?? null));
      });
      unsub = () => sub.subscription.unsubscribe();
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(true);
    }

    return () => { cancelled = true; unsub?.(); };
  }, []);

  /* Close menu on outside click. */
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  /* Pre-hydration: hide entirely so the unauthenticated button doesn't
     flash before we know the real state. */
  if (!loaded) {
    return <div style={{ width: 80, height: 32 }}/>;
  }

  if (!user) {
    if (hideSignedOut) return null;
    return (
      <button
        onClick={() => router.push("/sign-in")}
        className="btn btn-ghost pressable"
        style={{ padding: "8px 14px", fontSize: 13 }}
      >
        {t("nav.signin")}
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={user.email ?? "Account"}
        title={user.email ?? "Account"}
        style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.72 0.09 240), oklch(0.55 0.10 250))",
          color: "white", fontSize: 12.5, fontWeight: 600,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "none", cursor: "pointer",
          fontFamily: "var(--font-ui)",
          letterSpacing: "-0.005em",
          boxShadow: "0 0 0 0.5px rgba(23,42,82,0.1), 0 4px 10px -4px oklch(0.40 0.10 248 / 0.45)",
        }}
      >
        {user.initial}
      </button>

      {open && (
        <div
          className="glass-strong"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            minWidth: 220,
            padding: 6, borderRadius: 14,
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(23,42,82,0.1), 0 16px 40px -12px rgba(15,23,42,0.35)",
            zIndex: 50,
          }}
        >
          <div style={{
            padding: "8px 10px 10px",
            borderBottom: "0.5px solid rgba(23,42,82,0.08)",
            marginBottom: 4,
          }}>
            <div style={{ fontSize: 11, color: "var(--ink-400)" }}>
              {lang === "zh" ? "已登录" : "Signed in as"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-900)", fontWeight: 500, wordBreak: "break-all" }}>
              {user.email ?? "—"}
            </div>
          </div>
          <a
            href="/workspace"
            style={menuItem}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <Icon name="sparkle" size={13}/> {t("dash.nav.work")}
          </a>
          <a
            href="/notebook"
            style={menuItem}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(23,42,82,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <Icon name="notebook" size={13}/> {t("dash.nav.notebook")}
          </a>
          <form action="/auth/sign-out" method="POST" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{ ...menuItem, width: "100%", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "var(--font-ui)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "oklch(0.95 0.05 25 / 0.5)"; e.currentTarget.style.color = "oklch(0.42 0.13 25)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-700)"; }}
            >
              <Icon name="arrow" size={13} style={{ transform: "rotate(180deg)" }}/>
              {lang === "zh" ? "退出登录" : "Sign out"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const menuItem = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 10px",
  fontSize: 13, color: "var(--ink-700)",
  textDecoration: "none",
  borderRadius: 8,
  transition: "all 160ms var(--ease)",
  letterSpacing: "-0.005em",
} as const;

function toUser(email: string | null): { email: string | null; initial: string } | null {
  if (email === null) return null;
  const initial = (email[0] ?? "?").toUpperCase();
  return { email, initial };
}
