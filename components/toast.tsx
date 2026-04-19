"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./icons";

/* Small in-app toast — slides in from the bottom, auto-dismisses after
   2.5s. One toast at a time; a new one replaces the current. Used for
   "Link copied", "Bookmarked", "Free during beta", etc. */

type ToastKind = "info" | "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind; icon?: IconName };

type Ctx = { push: (message: string, opts?: { kind?: ToastKind; icon?: IconName }) => void };

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((message: string, opts?: { kind?: ToastKind; icon?: IconName }) => {
    idRef.current += 1;
    setToast({ id: idRef.current, message, kind: opts?.kind ?? "success", icon: opts?.icon });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {toast && <ToastView toast={toast} onDismiss={() => setToast(null)}/>}
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const accent = toast.kind === "error"
    ? "oklch(0.45 0.13 25)"
    : toast.kind === "info"
      ? "var(--ink-700)"
      : "oklch(0.42 0.10 248)";
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 80, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 150,
        animation: "toast-in 220ms var(--ease)",
      }}
    >
      <div
        className="glass-strong"
        style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "10px 16px",
          borderRadius: 999,
          fontSize: 13, fontWeight: 500,
          color: accent,
          fontFamily: "var(--font-ui)",
          letterSpacing: "-0.005em",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(23,42,82,0.1), 0 16px 40px -12px rgba(15,23,42,0.35)",
          cursor: "pointer",
        }}
        onClick={onDismiss}
      >
        {toast.icon && <Icon name={toast.icon} size={14}/>}
        <span>{toast.message}</span>
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
