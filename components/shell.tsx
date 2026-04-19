"use client";

import { LangProvider } from "@/lib/i18n/context";
import { TweaksProvider, useTweaks } from "@/lib/tweaks/context";
import { AmbientParallax, CustomCursor } from "./interactions";
import { PageSwitcher } from "./page-switcher";
import { ToastProvider } from "./toast";
import { TweaksButton, TweaksPanel } from "./tweaks-panel";

function ShellChrome() {
  const { tweaks } = useTweaks();
  return (
    <>
      <CustomCursor/>
      {tweaks.ambientMotion && <AmbientParallax/>}
      <PageSwitcher/>
      <TweaksButton/>
      <TweaksPanel/>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <TweaksProvider>
        <ToastProvider>
          {children}
          <ShellChrome/>
        </ToastProvider>
      </TweaksProvider>
    </LangProvider>
  );
}
