"use client";

import {
  useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type ReactNode,
} from "react";
import { Icon } from "./icons";
import type { Highlight } from "@/lib/api";

/* ============================================================
   Highlightable text — wraps a string, renders any matching
   highlights as <mark>, and offers a floating "+" button when
   the user selects text inside it.
   ============================================================ */

type HighlightableProps = {
  blockId: string;
  text: string;
  highlights: Highlight[];     /* already filtered to this block by the parent */
  onAdd: (text: string) => void;
  onUpdate: (id: string, annotation: string) => void;
  onDelete: (id: string) => void;
  /* Layout: pass through font / spacing */
  as?: "p" | "div" | "span";
  style?: CSSProperties;
  className?: string;
  children?: ReactNode; /* unused — text comes from `text` */
};

type Segment =
  | { kind: "text"; value: string }
  | { kind: "mark"; value: string; highlight: Highlight };

/* Build the list of segments to render. Highlights are positioned by
   first occurrence of `text` within `paragraph`. Overlaps: later
   highlights that overlap an earlier one are dropped. */
function buildSegments(paragraph: string, highlights: Highlight[]): Segment[] {
  type Range = { start: number; end: number; highlight: Highlight };
  const ranges: Range[] = [];

  for (const h of highlights) {
    const needle = h.text;
    if (!needle) continue;
    const start = paragraph.indexOf(needle);
    if (start < 0) continue;
    const end = start + needle.length;
    /* Skip if it overlaps any already-placed range */
    if (ranges.some(r => !(end <= r.start || start >= r.end))) continue;
    ranges.push({ start, end, highlight: h });
  }

  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) {
      segments.push({ kind: "text", value: paragraph.slice(cursor, r.start) });
    }
    segments.push({ kind: "mark", value: paragraph.slice(r.start, r.end), highlight: r.highlight });
    cursor = r.end;
  }
  if (cursor < paragraph.length) {
    segments.push({ kind: "text", value: paragraph.slice(cursor) });
  }
  return segments;
}

export function Highlightable({
  blockId, text, highlights, onAdd, onUpdate, onDelete,
  as = "p", style, className,
}: HighlightableProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [pendingSelection, setPendingSelection] = useState<{
    text: string; rect: DOMRect;
  } | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<{
    highlight: Highlight; anchorRect: DOMRect; mode: "view" | "edit";
  } | null>(null);

  /* Selection detection — only fires when the selection is fully
     inside this block. */
  useEffect(() => {
    const onMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPendingSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        setPendingSelection(null);
        return;
      }
      const selected = sel.toString().trim();
      if (selected.length < 3) {
        setPendingSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setPendingSelection({ text: selected, rect });
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  /* Click outside to dismiss the popover/button */
  useEffect(() => {
    if (!pendingSelection && !activeHighlight) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-hl-overlay]")) return;
      if (target.closest("mark[data-hl]")) return;
      setActiveHighlight(null);
      /* keep pendingSelection alive only until the next mouseup that
         resolves it; clear here too if click is outside the container */
      const container = containerRef.current;
      if (container && !container.contains(target)) {
        setPendingSelection(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [pendingSelection, activeHighlight]);

  const segments = buildSegments(text, highlights);

  const handleMarkEnter = (h: Highlight, target: HTMLElement) => {
    if (activeHighlight?.mode === "edit") return; /* don't steal focus */
    setActiveHighlight({ highlight: h, anchorRect: target.getBoundingClientRect(), mode: "view" });
  };
  const handleMarkLeave = () => {
    if (activeHighlight?.mode === "edit") return;
    setActiveHighlight(null);
  };
  const handleMarkClick = (h: Highlight, target: HTMLElement) => {
    setActiveHighlight({ highlight: h, anchorRect: target.getBoundingClientRect(), mode: "edit" });
  };

  const Tag = as as keyof React.JSX.IntrinsicElements;

  return (
    <>
      {/* @ts-expect-error — dynamic tag with ref is awkward to type but works at runtime */}
      <Tag ref={containerRef} className={className} style={style} data-hl-block={blockId}>
        {segments.map((seg, i) => {
          if (seg.kind === "text") return <span key={i}>{seg.value}</span>;
          const h = seg.highlight;
          return (
            <mark
              key={h.id}
              data-hl
              data-hl-id={h.id}
              onMouseEnter={e => handleMarkEnter(h, e.currentTarget)}
              onMouseLeave={handleMarkLeave}
              onClick={e => { e.stopPropagation(); handleMarkClick(h, e.currentTarget); }}
              style={{
                background: `oklch(0.93 0.10 ${h.hue} / 0.6)`,
                borderBottom: `1.5px solid oklch(0.70 0.13 ${h.hue} / 0.7)`,
                padding: "0 1px",
                cursor: "pointer",
                color: "inherit",
              }}
            >
              {seg.value}
            </mark>
          );
        })}
      </Tag>

      {pendingSelection && (
        <FloatingAddButton
          rect={pendingSelection.rect}
          onClick={() => {
            onAdd(pendingSelection.text);
            window.getSelection()?.removeAllRanges();
            setPendingSelection(null);
          }}
        />
      )}

      {activeHighlight && (
        <AnnotationPopover
          highlight={activeHighlight.highlight}
          anchorRect={activeHighlight.anchorRect}
          mode={activeHighlight.mode}
          onSave={ann => {
            onUpdate(activeHighlight.highlight.id, ann);
            setActiveHighlight(null);
          }}
          onDelete={() => {
            onDelete(activeHighlight.highlight.id);
            setActiveHighlight(null);
          }}
          onClose={() => setActiveHighlight(null)}
          onEdit={() => setActiveHighlight({ ...activeHighlight, mode: "edit" })}
        />
      )}
    </>
  );
}

/* ============================================================
   Floating "+" button anchored to the user's selection rect.
   Renders into a portal-free fixed overlay.
   ============================================================ */
function FloatingAddButton({ rect, onClick }: { rect: DOMRect; onClick: () => void }) {
  const top = Math.max(rect.top - 36, 8);
  const left = rect.left + rect.width / 2;
  return (
    <div
      data-hl-overlay
      style={{
        position: "fixed",
        top, left,
        transform: "translateX(-50%)",
        zIndex: 80,
        animation: "reveal 180ms var(--ease)",
      }}
    >
      <button
        onMouseDown={e => e.preventDefault()} /* don't lose the selection */
        onClick={onClick}
        className="glass-strong"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px", border: "none",
          borderRadius: 999,
          fontSize: 12.5, fontWeight: 500,
          color: "var(--ink-900)",
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          letterSpacing: "-0.005em",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(23,42,82,0.1), 0 12px 32px -10px rgba(15,23,42,0.35)",
        }}
      >
        <Icon name="highlight" size={13} style={{ color: "oklch(0.55 0.12 65)" }}/>
        Highlight
      </button>
    </div>
  );
}

/* ============================================================
   Annotation popover — view + edit + delete.
   ============================================================ */
function AnnotationPopover({
  highlight, anchorRect, mode, onSave, onDelete, onClose, onEdit,
}: {
  highlight: Highlight;
  anchorRect: DOMRect;
  mode: "view" | "edit";
  onSave: (annotation: string) => void;
  onDelete: () => void;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [draft, setDraft] = useState(highlight.annotation ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  /* Position the popover after it mounts so we can measure its width.
     Anchor below the highlight, centered, clamped to viewport. */
  useLayoutEffect(() => {
    if (!ref.current) return;
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    const top = Math.min(anchorRect.bottom + 8, window.innerHeight - h - 8);
    const rawLeft = anchorRect.left + anchorRect.width / 2 - w / 2;
    const left = Math.min(Math.max(8, rawLeft), window.innerWidth - w - 8);
    setPos({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    if (mode === "edit") taRef.current?.focus();
  }, [mode]);

  const save = () => onSave(draft.trim());

  return (
    <div
      data-hl-overlay
      ref={ref}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999, left: pos?.left ?? -9999,
        opacity: pos ? 1 : 0,
        zIndex: 90, width: 300,
        transition: "opacity 160ms var(--ease)",
      }}
      onMouseEnter={mode === "view" ? undefined : undefined}
    >
      <div
        className="glass-strong"
        style={{
          padding: 14, borderRadius: 14,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(23,42,82,0.1), 0 14px 36px -12px rgba(15,23,42,0.35)",
        }}
      >
        <div style={{
          fontSize: 12, fontStyle: "italic", color: "var(--ink-700)",
          lineHeight: 1.45, marginBottom: 10,
          padding: "8px 10px",
          background: `oklch(0.96 0.06 ${highlight.hue} / 0.5)`,
          borderLeft: `2px solid oklch(0.70 0.13 ${highlight.hue})`,
          borderRadius: "0 8px 8px 0",
          maxHeight: 80, overflow: "auto",
        }}>
          &ldquo;{highlight.text}&rdquo;
        </div>

        {mode === "view" ? (
          <>
            <div style={{
              fontSize: 13, lineHeight: 1.55, color: highlight.annotation ? "var(--ink-700)" : "var(--ink-400)",
              fontStyle: highlight.annotation ? "normal" : "italic",
              marginBottom: 10, minHeight: 18,
            }}>
              {highlight.annotation || "No annotation yet."}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button
                onClick={onDelete}
                style={popoverBtnStyle({ subtle: true, danger: true })}
              >
                <Icon name="trash" size={11}/> Delete
              </button>
              <button
                onClick={onEdit}
                style={popoverBtnStyle({})}
              >
                <Icon name="highlight" size={11}/>
                {highlight.annotation ? "Edit note" : "Add note"}
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              ref={taRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") onClose();
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              }}
              placeholder="What does this make you think of?"
              style={{
                width: "100%", minHeight: 80,
                background: "rgba(255,255,255,0.55)",
                border: "0.5px solid rgba(23,42,82,0.12)",
                borderRadius: 10, padding: 10,
                fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.5,
                color: "var(--ink-900)", resize: "vertical", outline: "none",
                letterSpacing: "-0.005em",
                marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
              <span style={{ fontSize: 10.5, color: "var(--ink-400)" }}>
                ⌘↵ to save · Esc to cancel
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={onClose} style={popoverBtnStyle({ subtle: true })}>Cancel</button>
                <button onClick={save} style={popoverBtnStyle({ primary: true })}>Save</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function popoverBtnStyle({
  subtle, danger, primary,
}: { subtle?: boolean; danger?: boolean; primary?: boolean }): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "5px 10px", border: "none",
    borderRadius: 999, fontSize: 11.5, fontWeight: 500,
    cursor: "pointer", fontFamily: "var(--font-ui)",
    letterSpacing: "-0.005em",
    color: danger ? "oklch(0.42 0.13 25)"
      : primary ? "white"
      : "var(--ink-700)",
    background: primary
      ? "linear-gradient(180deg, oklch(0.42 0.10 248), oklch(0.34 0.09 250))"
      : subtle ? "transparent" : "rgba(23,42,82,0.05)",
    transition: "all 180ms var(--ease)",
  };
}
