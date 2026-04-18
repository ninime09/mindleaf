import type { CSSProperties, ReactNode } from "react";

export type IconName =
  | "leaf" | "home" | "notebook" | "sparkle" | "search" | "plus" | "arrow" | "arrowUp"
  | "check" | "blog" | "podcast" | "video" | "book" | "tag" | "folder" | "highlight"
  | "bolt" | "archive" | "settings" | "clock" | "heart" | "bookmark" | "link" | "x"
  | "chevron" | "chevronDown" | "mic" | "waveform" | "grid" | "list" | "filter" | "more"
  | "brain" | "share" | "play" | "quote";

type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
};

export function Icon({ name, size = 18, stroke = 1.6, className = "", style }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    leaf: <><path d="M20 4C10 4 4 10 4 19c0 1 0 1 1 1 9 0 15-6 15-16z"/><path d="M4 20c4-4 8-6 14-8"/></>,
    home: <><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></>,
    notebook: <><path d="M4 4h13a2 2 0 012 2v14H6a2 2 0 01-2-2V4z"/><path d="M4 4h13v16"/><path d="M8 9h6M8 13h6"/></>,
    sparkle: <><path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z"/><path d="M19 16l.8 2L22 19l-2.2 1-.8 2-.8-2L16 19l2.2-1z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    arrowUp: <><path d="M12 19V5M6 11l6-6 6 6"/></>,
    check: <><path d="M5 12l4.5 4.5L19 7"/></>,
    blog: <><path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6M9 18h4"/></>,
    podcast: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/></>,
    video: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></>,
    book: <><path d="M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4V4z"/><path d="M5 4v12a4 4 0 014 4"/></>,
    tag: <><path d="M20 12l-8 8-8-8V4h8z"/><circle cx="8" cy="8" r="1.2"/></>,
    folder: <><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></>,
    highlight: <><path d="M4 20h16"/><path d="M7 17l6-6 4 4-6 6H7z"/><path d="M13 11l5-5 2 2-5 5"/></>,
    bolt: <><path d="M13 3L4 14h6l-1 7 9-11h-6z"/></>,
    archive: <><rect x="3" y="5" width="18" height="4" rx="1"/><path d="M5 9v10h14V9"/><path d="M10 13h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1A2 2 0 114.3 17l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1A2 2 0 117 4.3l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>,
    heart: <><path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/></>,
    bookmark: <><path d="M6 3h12v18l-6-4-6 4z"/></>,
    link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 10-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 105.7 5.7l1-1"/></>,
    x: <><path d="M6 6l12 12M18 6L6 18"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    chevronDown: <><path d="M6 9l6 6 6-6"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></>,
    waveform: <><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
    filter: <><path d="M4 5h16l-6 8v6l-4-2v-4z"/></>,
    more: <><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
    brain: <><path d="M9 4a3 3 0 00-3 3v1a3 3 0 00-2 3 3 3 0 001 2 3 3 0 002 4 3 3 0 003 3V4z"/><path d="M15 4a3 3 0 013 3v1a3 3 0 012 3 3 3 0 01-1 2 3 3 0 01-2 4 3 3 0 01-3 3V4z"/></>,
    share: <><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4M12 2v14"/></>,
    play: <><path d="M6 4l14 8-14 8z"/></>,
    quote: <><path d="M7 7h4v4H7zM7 11c0 3 1 5 4 6M13 7h4v4h-4zM13 11c0 3 1 5 4 6"/></>,
  };
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
    >
      {paths[name] ?? null}
    </svg>
  );
}

export function Logo({ size = 26, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="ml-grad" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="oklch(0.72 0.09 240)"/>
            <stop offset="100%" stopColor="oklch(0.48 0.10 250)"/>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#ml-grad)" opacity="0.18"/>
        <rect x="1" y="1" width="30" height="30" rx="9" fill="none" stroke="url(#ml-grad)" strokeOpacity="0.5" strokeWidth="0.8"/>
        <path d="M22 9c-8 0-13 5-13 13 0 0.8 0 0.8 0.8 0.8 8 0 13-5 13-13.8z"
          stroke="oklch(0.35 0.10 248)" strokeWidth="1.4" fill="oklch(0.85 0.06 240 / 0.4)"/>
        <path d="M9 23c3-3 6-5 11-6.5" stroke="oklch(0.35 0.10 248)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {withWord && (
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: size * 0.85,
          letterSpacing: "-0.02em",
          color: "var(--ink-900)",
        }}>Mindleaf</span>
      )}
    </div>
  );
}
