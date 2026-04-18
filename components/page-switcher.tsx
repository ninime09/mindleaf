"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { useLang } from "@/lib/i18n/context";

type PageId = "landing" | "workspace" | "notebook" | "detail" | "pricing";

const PATHS: Record<PageId, string> = {
  landing: "/",
  workspace: "/workspace",
  notebook: "/notebook",
  detail: "/read/designing-calm-software",
  pricing: "/pricing",
};

function activeId(pathname: string): PageId {
  if (pathname.startsWith("/workspace")) return "workspace";
  if (pathname.startsWith("/notebook"))  return "notebook";
  if (pathname.startsWith("/read"))      return "detail";
  if (pathname.startsWith("/pricing"))   return "pricing";
  return "landing";
}

export function PageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { t } = useLang();
  const current = activeId(pathname);

  const pages: { id: PageId; label: string; icon: IconName }[] = [
    { id: "landing",   label: t("sw.landing"),  icon: "leaf"     },
    { id: "workspace", label: t("sw.work"),     icon: "sparkle"  },
    { id: "notebook",  label: t("sw.notebook"), icon: "notebook" },
    { id: "detail",    label: t("sw.detail"),   icon: "book"     },
    { id: "pricing",   label: t("sw.pricing"),  icon: "bolt"     },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 100,
    }}>
      <div className="glass-strong" style={{
        display: "flex", padding: 4, borderRadius: 999,
        boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 0.5px rgba(23,42,82,0.08), 0 20px 40px -16px rgba(23,42,82,0.25)",
      }}>
        {pages.map(p => {
          const active = p.id === current;
          return (
            <button key={p.id} onClick={() => router.push(PATHS[p.id])} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", border: "none",
              background: active ? "oklch(0.42 0.10 248)" : "transparent",
              color: active ? "white" : "var(--ink-700)",
              borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              cursor: "pointer", fontFamily: "var(--font-ui)",
              letterSpacing: "-0.005em",
              transition: "all 260ms var(--ease)",
              boxShadow: active ? "0 4px 10px -4px oklch(0.42 0.10 248 / 0.5)" : "none",
            }}>
              <Icon name={p.icon} size={13}/>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
