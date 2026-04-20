"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Icon, Logo } from "@/components/icons";
import { Magnetic } from "@/components/interactions";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";

export default function SignIn() {
  const router = useRouter();
  const { lang } = useLang();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  /* Surface auth errors that came back from /auth/callback (e.g. an
     expired magic link). Reading window.location avoids needing to
     wrap the page in a Suspense boundary for useSearchParams. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err) return;
    const message = err === "missing_code"
      ? (lang === "zh" ? "登录链接缺少必要参数。请重新发送。" : "Sign-in link was missing its code. Send a new one.")
      : err.includes("expired") || err.includes("invalid")
        ? (lang === "zh"
            ? "登录链接已失效（一小时后过期，或邮件客户端可能预读了一次）。请重新发送。"
            : "That link has expired or already been used. Send a new one.")
        : err;
    push(message, { kind: "error", icon: "bolt" });
    /* Strip the error from the URL so a refresh doesn't re-toast. */
    const clean = new URL(window.location.href);
    clean.searchParams.delete("error");
    window.history.replaceState(null, "", clean.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Lazily create the client inside handlers — keeps build-time
     pre-render from blowing up before env vars are set. */
  const callbackUrl = () => `${window.location.origin}/auth/callback?next=/workspace`;

  const onMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
      });
      if (error) {
        push(error.message, { kind: "error" });
        return;
      }
      setSent(true);
    } catch (err) {
      push(err instanceof Error ? err.message : "Auth not configured.", { kind: "error" });
    } finally {
      setSending(false);
    }
  };

  const onGoogle = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      if (error) push(error.message, { kind: "error" });
    } catch (err) {
      push(err instanceof Error ? err.message : "Auth not configured.", { kind: "error" });
    }
  };

  return (
    <div style={{
      position: "relative", zIndex: 2,
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div className="glass-strong" style={{
        width: "100%", maxWidth: 420,
        padding: 36, borderRadius: 24,
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(23,42,82,0.08), 0 30px 80px -24px rgba(15,23,42,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Link href="/" style={{ display: "inline-flex", textDecoration: "none" }}>
            <Logo size={28}/>
          </Link>
        </div>

        <h1 className="display" style={{
          fontSize: 28, margin: "0 0 8px", textAlign: "center",
          letterSpacing: "-0.02em",
        }}>
          {sent
            ? (lang === "zh" ? "查收你的邮件。" : "Check your email.")
            : (lang === "zh" ? "登录 Mindleaf" : "Sign in to Mindleaf")}
        </h1>
        <p style={{
          fontSize: 13.5, color: "var(--ink-500)", textAlign: "center",
          margin: "0 0 28px", lineHeight: 1.55,
        }}>
          {sent
            ? (lang === "zh"
                ? `登录链接已发到 ${email}。点开就能进。`
                : `A sign-in link is on its way to ${email}. Tap it to come right back.`)
            : (lang === "zh"
                ? "用邮箱或 Google 账号登录，笔记会跨设备同步。"
                : "Use your email or Google account. Your notebook syncs across devices.")}
        </p>

        {!sent && (
          <>
            <form onSubmit={onMagicLink} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="email"
                autoComplete="email"
                placeholder={lang === "zh" ? "你的邮箱" : "you@example.com"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={sending}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14, fontFamily: "var(--font-ui)",
                  color: "var(--ink-900)",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(23,42,82,0.1)",
                  borderRadius: 12, outline: "none",
                  letterSpacing: "-0.005em",
                }}
              />
              <Magnetic strength={0.2}>
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="btn btn-primary pressable"
                  style={{
                    width: "100%", justifyContent: "center",
                    padding: "12px 16px", fontSize: 14,
                    opacity: (sending || !email.trim()) ? 0.6 : 1,
                    cursor: (sending || !email.trim()) ? "not-allowed" : "pointer",
                  }}
                >
                  {sending
                    ? <><span className="ml-spinner" aria-hidden/> {lang === "zh" ? "发送中…" : "Sending…"}</>
                    : <>{lang === "zh" ? "发送登录链接" : "Send a magic link"} <Icon name="arrow" size={14}/></>}
                </button>
              </Magnetic>
            </form>

            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              margin: "20px 0", color: "var(--ink-400)", fontSize: 11,
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(23,42,82,0.1)" }}/>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {lang === "zh" ? "或" : "or"}
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(23,42,82,0.1)" }}/>
            </div>

            <button
              onClick={onGoogle}
              className="btn btn-ghost pressable"
              style={{
                width: "100%", justifyContent: "center",
                padding: "12px 16px", fontSize: 14,
              }}
            >
              <GoogleGlyph/>
              {lang === "zh" ? "使用 Google 登录" : "Continue with Google"}
            </button>
          </>
        )}

        {sent && (
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            className="btn btn-ghost pressable"
            style={{
              width: "100%", justifyContent: "center",
              padding: "10px 16px", fontSize: 13,
            }}
          >
            <Icon name="chevron" size={13} style={{ transform: "rotate(180deg)" }}/>
            {lang === "zh" ? "用别的邮箱" : "Use a different email"}
          </button>
        )}

        <div style={{
          marginTop: 24, fontSize: 11.5, color: "var(--ink-400)",
          textAlign: "center", lineHeight: 1.5,
        }}>
          {lang === "zh" ? "首次登录将自动创建账户。" : "First-time sign-ins create an account automatically."}
          {" "}
          <button
            onClick={() => router.push("/")}
            style={{
              border: "none", background: "transparent",
              color: "var(--accent-deep)", fontSize: 11.5,
              cursor: "pointer", padding: 0, fontFamily: "var(--font-ui)",
            }}
          >
            {lang === "zh" ? "回首页" : "Back to home"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
