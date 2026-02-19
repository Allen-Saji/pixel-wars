"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT, BYTES_PER_PIXEL } from "@/lib/constants";

const PIXEL_SIZE = 10;
const CANVAS_PX = CANVAS_WIDTH * PIXEL_SIZE; // 500

interface PixelCanvasProps {
  pixels: Uint8Array | null;
  onPixelClick: (x: number, y: number) => void;
  disabled?: boolean;
}

export function PixelCanvas({ pixels, onPixelClick, disabled }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverCoords, setHoverCoords] = useState<[number, number] | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Render pixels to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear to black
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    if (pixels) {
      // Draw each pixel as a filled rect
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          const i = (y * CANVAS_WIDTH + x) * BYTES_PER_PIXEL;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          // Skip black pixels (already cleared to black)
          if (r === 0 && g === 0 && b === 0) continue;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    // Grid lines
    if (showGrid && zoom >= 0.8) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * PIXEL_SIZE, 0);
        ctx.lineTo(x * PIXEL_SIZE, CANVAS_PX);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * PIXEL_SIZE);
        ctx.lineTo(CANVAS_PX, y * PIXEL_SIZE);
        ctx.stroke();
      }
    }

    // Hover highlight
    if (hoverCoords) {
      const [hx, hy] = hoverCoords;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(hx * PIXEL_SIZE + 0.5, hy * PIXEL_SIZE + 0.5, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
    }
  }, [pixels, hoverCoords, showGrid, zoom]);

  const getPixelCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = CANVAS_PX / rect.width;
      const scaleY = CANVAS_PX / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
      const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);
      return [
        Math.max(0, Math.min(CANVAS_WIDTH - 1, x)),
        Math.max(0, Math.min(CANVAS_HEIGHT - 1, y)),
      ];
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const [x, y] = getPixelCoords(e);
      onPixelClick(x, y);
    },
    [disabled, getPixelCoords, onPixelClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const [x, y] = getPixelCoords(e);
      setHoverCoords([x, y]);
    },
    [getPixelCoords]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-2 items-center">
          <button
            className={`px-2 py-0.5 rounded text-xs border ${showGrid ? "bg-secondary" : "bg-background"} border-border`}
            onClick={() => setShowGrid(!showGrid)}
          >
            Grid
          </button>
          <button
            className="px-2 py-0.5 rounded text-xs border border-border"
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
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
        {hoverCoords && (
          <span className="font-mono">
            ({hoverCoords[0]}, {hoverCoords[1]})
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        className="overflow-auto border border-border rounded-md bg-black"
        style={{ maxWidth: "100%", maxHeight: "70vh" }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_PX}
          height={CANVAS_PX}
          className={disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"}
          style={{
            width: CANVAS_PX * zoom,
            height: CANVAS_PX * zoom,
            imageRendering: "pixelated",
          }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoords(null)}
        />
      </div>
    </div>
  );
}
