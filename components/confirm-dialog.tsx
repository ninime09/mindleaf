"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./icons";

type Props = {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/* A small, glass-styled confirmation modal. Closes on Escape and on
   backdrop click. The destructive variant uses a warm red CTA. */
export function ConfirmDialog({
  open, title, body, confirmLabel, cancelLabel, destructive, onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15, 23, 42, 0.18)",
        backdropFilter: "blur(6px) saturate(140%)",
        WebkitBackdropFilter: "blur(6px) saturate(140%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "reveal 200ms var(--ease)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-strong"
        style={{
          maxWidth: 420, width: "100%",
          padding: 28, borderRadius: 22,
          boxShadow: "0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(23,42,82,0.1), 0 30px 80px -24px rgba(15,23,42,0.35)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14,
        }}>
          {destructive && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "oklch(0.94 0.06 25 / 0.7)",
              border: "0.5px solid oklch(0.78 0.10 25 / 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "oklch(0.42 0.13 25)", flexShrink: 0,
            }}>
              <Icon name="trash" size={16}/>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{
              fontSize: 19, letterSpacing: "-0.015em", lineHeight: 1.25,
              color: "var(--ink-900)",
            }}>{title}</div>
            {body && (
              <div style={{
                marginTop: 8, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-500)",
              }}>{body}</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
          <button
            onClick={onCancel}
            className="btn btn-ghost pressable"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="pressable"
            style={{
              padding: "9px 16px", fontSize: 13, fontWeight: 500,
              borderRadius: "var(--r-pill)",
              border: "1px solid transparent",
              cursor: "pointer",
              fontFamily: "var(--font-ui)", letterSpacing: "-0.005em",
              color: "white",
              background: destructive
                ? "linear-gradient(180deg, oklch(0.55 0.16 25), oklch(0.45 0.15 25))"
                : "linear-gradient(180deg, oklch(0.42 0.10 248), oklch(0.34 0.09 250))",
              boxShadow: destructive
                ? "0 1px 0 rgba(255,255,255,0.25) inset, 0 0 0 0.5px rgba(80,12,12,0.25), 0 10px 24px -10px oklch(0.50 0.16 25 / 0.55)"
                : "0 1px 0 rgba(255,255,255,0.25) inset, 0 0 0 0.5px rgba(23,42,82,0.2), 0 10px 24px -10px oklch(0.40 0.10 248 / 0.45)",
              transition: "all 220ms var(--ease)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
