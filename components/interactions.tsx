"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ============================================================
   CustomCursor — tiny dot + eased glass ring.
   idle / hover (outline) / text modes.
   ============================================================ */
export function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchMedia("(pointer: coarse)").matches) return;
    document.documentElement.classList.add("cursor-custom");

    const state = {
      x: -100, y: -100,
      rx: -100, ry: -100,
      scale: 1, tScale: 1,
      hoverMode: "idle" as "idle" | "hover" | "text",
      tHoverMode: "idle" as "idle" | "hover" | "text",
      hidden: true,
    };

    const onMove = (e: MouseEvent) => {
      state.x = e.clientX;
      state.y = e.clientY;
      if (state.hidden) {
        state.rx = e.clientX;
        state.ry = e.clientY;
        state.hidden = false;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const hover = el?.closest(
        '[data-cursor="hover"], button, a, [role="button"], input:not([type=range]), textarea, select, [data-cursor="text"]'
      );
      const isText = !!el?.closest('[data-cursor="text"], input:not([type=range]), textarea');
      state.tScale = hover ? (isText ? 0.4 : 1.6) : 1;
      state.tHoverMode = isText ? "text" : hover ? "hover" : "idle";
    };
    const onLeave = () => { state.hidden = true; };
    const onEnter = () => { state.hidden = false; };
    const onDown  = () => { state.tScale *= 0.75; };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);
    window.addEventListener("mousedown", onDown);

    let raf = 0;
    const tick = () => {
      state.rx = lerp(state.rx, state.x, 0.18);
      state.ry = lerp(state.ry, state.y, 0.18);
      state.scale = lerp(state.scale, state.tScale, 0.18);
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${state.x - 3}px, ${state.y - 3}px, 0)`;
        dotRef.current.style.opacity = String(state.hidden ? 0 : (state.tHoverMode === "text" ? 0 : 1));
      }
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate3d(${state.rx - 16}px, ${state.ry - 16}px, 0) scale(${state.scale})`;
        ringRef.current.style.opacity = String(state.hidden ? 0 : 1);
        if (ringRef.current.dataset.mode !== state.tHoverMode) {
          ringRef.current.dataset.mode = state.tHoverMode;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mousedown", onDown);
      document.documentElement.classList.remove("cursor-custom");
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="ml-cursor-ring" data-mode="idle" style={{
        position: "fixed", top: 0, left: 0, width: 32, height: 32,
        borderRadius: "50%", pointerEvents: "none", zIndex: 9999,
        transition: "opacity 300ms var(--ease), background 260ms var(--ease), box-shadow 260ms var(--ease), border-color 260ms var(--ease)",
        willChange: "transform",
      }}/>
      <div ref={dotRef} style={{
        position: "fixed", top: 0, left: 0, width: 6, height: 6,
        borderRadius: "50%", pointerEvents: "none", zIndex: 10000,
        background: "oklch(0.35 0.10 248)",
        boxShadow: "0 0 8px oklch(0.55 0.10 248 / 0.5)",
        transition: "opacity 200ms var(--ease)",
        willChange: "transform",
      }}/>
    </>
  );
}

/* ============================================================
   AmbientParallax — nudges .ambient layer with cursor.
   ============================================================ */
export function AmbientParallax() {
  useEffect(() => {
    const el = document.querySelector<HTMLDivElement>(".ambient");
    if (!el) return;
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth, h = window.innerHeight;
      tx = (e.clientX / w - 0.5) * 24;
      ty = (e.clientY / h - 0.5) * 16;
    };
    const tick = () => {
      x = lerp(x, tx, 0.06);
      y = lerp(y, ty, 0.06);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      el.style.transform = "";
    };
  }, []);
  return null;
}

/* ============================================================
   Magnetic — subtle pull toward cursor within radius.
   ============================================================ */
export function Magnetic({
  children, strength = 0.25, radius = 120, style,
}: {
  children: ReactNode; strength?: number; radius?: number; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(pointer: coarse)").matches) return;

    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        active = true;
        tx = dx * strength;
        ty = dy * strength;
      } else if (active) {
        tx = 0; ty = 0;
        active = false;
      }
    };
    const tick = () => {
      x = lerp(x, tx, 0.15);
      y = lerp(y, ty, 0.15);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      if (el) el.style.transform = "";
    };
  }, [strength, radius]);

  return (
    <div ref={ref} style={{ display: "inline-block", willChange: "transform", ...style }}>
      {children}
    </div>
  );
}

/* ============================================================
   TiltCard — 3D tilt with specular sheen.
   ============================================================ */
export function TiltCard({
  children, max = 6, glare = true, style, className = "",
  onClick,
}: {
  children: ReactNode; max?: number; glare?: boolean;
  style?: CSSProperties; className?: string; onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(pointer: coarse)").matches) return;

    let rx = 0, ry = 0, trx = 0, try_ = 0, gx = 50, gy = 50, raf = 0;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      trx = (py - 0.5) * -max * 2;
      try_ = (px - 0.5) *  max * 2;
      gx = px * 100;
      gy = py * 100;
    };
    const onLeave = () => { trx = 0; try_ = 0; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    const tick = () => {
      rx = lerp(rx, trx, 0.12);
      ry = lerp(ry, try_, 0.12);
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (glareRef.current) {
        glareRef.current.style.background =
          `radial-gradient(220px circle at ${gx}% ${gy}%, rgba(255,255,255,0.45), transparent 55%)`;
        glareRef.current.style.opacity = String((Math.abs(rx) + Math.abs(ry)) > 0.3 ? 1 : 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (el) el.style.transform = "";
    };
  }, [max]);

  return (
    <div ref={ref} className={className} onClick={onClick} style={{
      willChange: "transform",
      transformStyle: "preserve-3d",
      position: "relative",
      ...style,
    }}>
      {children}
      {glare && (
        <div ref={glareRef} style={{
          position: "absolute", inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 320ms var(--ease)",
          mixBlendMode: "soft-light",
        }}/>
      )}
    </div>
  );
}

/* ============================================================
   Spotlight — radial glow that follows cursor in-box.
   ============================================================ */
export function Spotlight({
  children, color = "oklch(0.82 0.09 240 / 0.45)", size = 520, className = "", style,
}: {
  children: ReactNode; color?: string; size?: number; className?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0, x = 50, y = 50, tx = 50, ty = 50;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
    };
    const onEnter = () => { if (spotRef.current) spotRef.current.style.opacity = "1"; };
    const onLeave = () => { if (spotRef.current) spotRef.current.style.opacity = "0"; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    const tick = () => {
      x = lerp(x, tx, 0.12);
      y = lerp(y, ty, 0.12);
      if (spotRef.current) {
        spotRef.current.style.background =
          `radial-gradient(${size}px circle at ${x}% ${y}%, ${color}, transparent 60%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [color, size]);

  return (
    <div ref={ref} className={className} style={{ position: "relative", ...style }}>
      <div ref={spotRef} style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        pointerEvents: "none", opacity: 0,
        transition: "opacity 400ms var(--ease)",
        zIndex: 0,
      }}/>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ============================================================
   Reveal — fade-up on scroll into view.
   ============================================================ */
export function Reveal({
  children, delay = 0, y = 14, className = "", style,
}: {
  children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setShown(true); io.unobserve(el); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
      transition: `opacity 800ms var(--ease) ${delay}ms, transform 800ms var(--ease) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}
