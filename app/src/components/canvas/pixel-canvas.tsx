"use client";

import { useRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { CANVAS_WIDTH, CANVAS_HEIGHT, BYTES_PER_PIXEL } from "@/lib/constants";

const PIXEL_SIZE = 8;
const CANVAS_PX_W = CANVAS_WIDTH * PIXEL_SIZE;
const CANVAS_PX_H = CANVAS_HEIGHT * PIXEL_SIZE;

interface PixelCanvasProps {
  pixels: Uint8Array | null;
  isActive?: boolean;
}

export function PixelCanvas({ pixels, isActive }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = isDark ? "#0a0a0f" : "#ffffff";
    ctx.fillRect(0, 0, CANVAS_PX_W, CANVAS_PX_H);

    if (pixels) {
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          const i = (y * CANVAS_WIDTH + x) * BYTES_PER_PIXEL;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          if (r === 0 && g === 0 && b === 0) continue;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    if (showGrid && zoom >= 1) {
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * PIXEL_SIZE, 0);
        ctx.lineTo(x * PIXEL_SIZE, CANVAS_PX_H);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * PIXEL_SIZE);
        ctx.lineTo(CANVAS_PX_W, y * PIXEL_SIZE);
        ctx.stroke();
      }
    }
  }, [pixels, showGrid, zoom, isDark]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_PX_W / rect.width;
    const scaleY = CANVAS_PX_H / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / PIXEL_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / PIXEL_SIZE);
    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
      setHoverCoord({ x, y });
    } else {
      setHoverCoord(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ToolbarButton active={showGrid} onClick={() => setShowGrid(!showGrid)}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </ToolbarButton>
          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.04] rounded-lg border border-black/[0.08] dark:border-white/[0.06]">
            <button
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            >
              -
            </button>
            <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            >
              +
            </button>
          </div>
        </div>

        <div className="text-[10px] font-mono text-muted-foreground h-5 flex items-center">
          {hoverCoord ? (
            <span>({hoverCoord.x}, {hoverCoord.y})</span>
          ) : (
            <span className="opacity-40">{CANVAS_WIDTH}x{CANVAS_HEIGHT}</span>
          )}
        </div>
      </div>

      {/* Canvas — inline-block so container shrinks to fit, no white gap */}
      <div
        className={`relative overflow-auto rounded-xl bg-white dark:bg-[#0a0a0f] inline-block ${
          isActive ? "border-2 animate-border-glow" : "border-2 border-black/20 dark:border-white/[0.08]"
        }`}
        style={{ maxWidth: "100%", maxHeight: "75vh" }}
      >
        {isActive && (
          <>
            <div className="absolute top-0 left-0 w-8 h-[1px] bg-gradient-to-r from-[#6432ff]/50 to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 left-0 h-8 w-[1px] bg-gradient-to-b from-[#6432ff]/50 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-gradient-to-l from-[#32dc64]/50 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-8 w-[1px] bg-gradient-to-t from-[#32dc64]/50 to-transparent z-10 pointer-events-none" />
          </>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_PX_W}
          height={CANVAS_PX_H}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoord(null)}
          className="cursor-crosshair block"
          style={{
            width: CANVAS_PX_W * zoom,
            height: CANVAS_PX_H * zoom,
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-lg border transition-all ${
        active
          ? "bg-black/[0.06] dark:bg-white/[0.08] border-black/[0.1] dark:border-white/[0.12] text-foreground"
          : "bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.08] dark:border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}
