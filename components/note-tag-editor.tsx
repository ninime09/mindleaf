"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./icons";

/* Editable tag chips with a "+ add" affordance. Used for note tags on
   Detail and Workspace — both pages persist via setNoteTags(). */

type Props = {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  addLabel: string;
  placeholder: string;
  promptLabel?: ReactNode;
  style?: CSSProperties;
};

export function NoteTagEditor({
  tags, onAdd, onRemove, addLabel, placeholder, promptLabel, style,
}: Props) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", ...style }}>
      {promptLabel && (
        <span style={{ fontSize: 11.5, color: "var(--ink-500)", marginRight: 4 }}>{promptLabel}</span>
      )}
      {tags.map(tg => (
        <NoteTagPill key={tg} label={tg} onRemove={() => onRemove(tg)}/>
      ))}
      <AddTagButton onAdd={onAdd} placeholder={placeholder} addLabel={addLabel}/>
    </div>
  );
}

export function NoteTagPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 4px 3px 10px",
      fontSize: 11.5, fontWeight: 500,
      background: "oklch(0.92 0.05 235 / 0.6)",
      color: "oklch(0.36 0.10 245)",
      border: "0.5px solid rgba(23,42,82,0.06)",
      borderRadius: 999,
      letterSpacing: "-0.005em",
    }}>
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 16, height: 16, borderRadius: 999,
          border: "none", background: "transparent",
          color: "currentColor", opacity: 0.6, cursor: "pointer",
          transition: "opacity 160ms var(--ease)",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0.6"; }}
      >
        <Icon name="x" size={9}/>
      </button>
    </span>
  );
}

export function AddTagButton({ onAdd, placeholder, addLabel }: {
  onAdd: (tag: string) => void; placeholder: string; addLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          padding: "3px 10px",
          fontSize: 11.5, fontWeight: 500,
          color: "var(--ink-500)",
          background: "rgba(23,42,82,0.04)",
          border: "0.5px dashed rgba(23,42,82,0.2)",
          borderRadius: 999, cursor: "pointer",
          letterSpacing: "-0.005em",
          fontFamily: "var(--font-ui)",
        }}
      >
        {addLabel}
      </button>
    );
  }
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter") {
          if (value.trim()) onAdd(value);
          setValue("");
          setEditing(false);
        } else if (e.key === "Escape") {
          setValue("");
          setEditing(false);
        }
      }}
      onBlur={() => {
        if (value.trim()) onAdd(value);
        setValue("");
        setEditing(false);
      }}
      placeholder={placeholder}
      style={{
        padding: "3px 10px",
        fontSize: 11.5, fontWeight: 500,
        color: "var(--ink-900)",
        background: "rgba(255,255,255,0.7)",
        border: "0.5px solid oklch(0.65 0.10 245 / 0.5)",
        outline: "none",
        borderRadius: 999,
        width: 110,
        fontFamily: "var(--font-ui)",
        letterSpacing: "-0.005em",
      }}
    />
  );
}
