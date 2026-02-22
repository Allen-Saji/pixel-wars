"use client";

import { useRef, useEffect, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT, BYTES_PER_PIXEL } from "@/lib/constants";

const PIXEL_SIZE = 5;
const CANVAS_PX_W = CANVAS_WIDTH * PIXEL_SIZE; // 500
const CANVAS_PX_H = CANVAS_HEIGHT * PIXEL_SIZE; // 500

interface PixelCanvasProps {
  pixels: Uint8Array | null;
}

export function PixelCanvas({ pixels }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Render pixels to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear to black
    ctx.fillStyle = "#000";
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

    // Grid lines
    if (showGrid && zoom >= 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
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
  }, [pixels, showGrid, zoom]);

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          className={`px-2 py-0.5 rounded text-xs border ${showGrid ? "bg-secondary" : "bg-background"} border-border`}
          onClick={() => setShowGrid(!showGrid)}
        >
          Grid
        </button>
        <button
          className="px-2 py-0.5 rounded text-xs border border-border"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
        >
          +
        </button>
        <button
          className="px-2 py-0.5 rounded text-xs border border-border"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
        >
          -
        </button>
        <span>{Math.round(zoom * 100)}%</span>
      </div>

      {/* Canvas */}
      <div
        className="overflow-auto border border-border rounded-md bg-black"
        style={{ maxWidth: "100%", maxHeight: "75vh" }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_PX_W}
          height={CANVAS_PX_H}
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
