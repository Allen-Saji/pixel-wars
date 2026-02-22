"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { GamePanel } from "@/components/game/game-panel";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background — drifting color orbs */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
      >
        {/* Dark mode base gradient */}
        <div className="absolute inset-0 hidden dark:block" style={{ background: "linear-gradient(160deg, #06060a 0%, #0a0812 30%, #080a10 60%, #060a08 100%)" }} />
        {/* Light mode base gradient */}
        <div className="absolute inset-0 block dark:hidden" style={{ background: "linear-gradient(160deg, #f8f7f4 0%, #f0eef8 30%, #f2f7f4 60%, #f8f4f0 100%)" }} />

        <div className="bg-orb bg-orb-purple" style={{ top: "-15%", left: "20%" }} />
        <div className="bg-orb bg-orb-orange" style={{ top: "40%", right: "-10%" }} />
        <div className="bg-orb bg-orb-green" style={{ bottom: "-10%", left: "-5%" }} />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(128,128,128,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-3 flex items-center justify-between backdrop-blur-xl bg-white/60 dark:bg-black/40 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Pixel logo */}
          <div className="relative">
            <div className="grid grid-cols-3 gap-[2px]">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#ff6432]" />
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#32dc64]" />
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#6432ff]" />
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#6432ff]" />
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#ff6432]" />
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#32dc64]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              Pixel Wars
            </h1>
            <span className="text-[10px] font-mono text-[#6432ff] bg-[#6432ff]/10 border border-[#6432ff]/20 px-1.5 py-0.5 rounded-md">
              devnet
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#32dc64] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#32dc64]" />
            </span>
            <span className="text-xs text-muted-foreground font-medium">LIVE</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 max-w-[1200px] mx-auto w-full relative z-10">
        <GamePanel />
      </main>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.06] px-4 py-3 text-center relative z-10 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Powered by</span>
          <span className="font-semibold text-foreground/70">Solana</span>
          <span className="text-foreground/20">&times;</span>
          <span className="font-semibold text-foreground/70">MagicBlock Ephemeral Rollups</span>
        </div>
      </footer>
    </div>
  );
}
