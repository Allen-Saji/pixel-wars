"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PALETTE = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00",
  "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#FF8000", "#8000FF", "#0080FF", "#FF0080",
  "#808080", "#C0C0C0", "#800000", "#008000",
];

interface ColorPickerProps {
  color: [number, number, number];
  onColorChange: (color: [number, number, number]) => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

export function ColorPicker({ color, onColorChange }: ColorPickerProps) {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [hexInput, setHexInput] = useState(rgbToHex(...color));

  const selectColor = useCallback(
    (hex: string) => {
      const rgb = hexToRgb(hex);
      onColorChange(rgb);
      setHexInput(hex);
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== hex);
        return [hex, ...filtered].slice(0, 5);
      });
    },
    [onColorChange]
  );

  const handleHexSubmit = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      selectColor(hexInput.toUpperCase());
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Color</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current color preview */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded border border-border"
            style={{ backgroundColor: rgbToHex(...color) }}
          />
          <span className="text-xs font-mono text-muted-foreground">
            {rgbToHex(...color)}
          </span>
        </div>

        {/* Palette grid */}
        <div className="grid grid-cols-8 gap-1">
          {PALETTE.map((hex) => (
            <Tooltip key={hex}>
              <TooltipTrigger asChild>
                <button
                  className="w-6 h-6 rounded-sm border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: hex }}
                  onClick={() => selectColor(hex)}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-mono">{hex}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Hex input */}
        <div className="flex gap-1">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
            className="flex-1 h-7 px-2 text-xs font-mono border border-input rounded-md bg-background"
            placeholder="#FF0000"
            maxLength={7}
          />
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleHexSubmit}>
            Set
          </Button>
        </div>

        {/* Recent colors */}
        {recentColors.length > 0 && (
          <div className="flex gap-1 items-center">
            <span className="text-xs text-muted-foreground">Recent:</span>
            {recentColors.map((hex, i) => (
              <button
                key={`${hex}-${i}`}
                className="w-5 h-5 rounded-sm border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: hex }}
                onClick={() => selectColor(hex)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
