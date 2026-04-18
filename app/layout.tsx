import type { Metadata } from "next";
import { Inter, Instrument_Serif, Noto_Serif_SC, JetBrains_Mono } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-serif-sc",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Mindleaf — calm knowledge learning",
  description: "Turn articles, podcasts and videos into calm, beginner-friendly explanations — then quietly weave them into a knowledge notebook that's yours to revisit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${notoSerifSC.variable} ${jetBrainsMono.variable}`}
    >
      <body>
        <div className="ambient"/>
        <div className="grain"/>
        <div id="app" style={{ position: "relative", zIndex: 2 }}>
          <Shell>{children}</Shell>
        </div>
      </body>
    </html>
  );
}
