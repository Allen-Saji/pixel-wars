/**
 * Picasso — The Artist
 * Draws pixel art templates and math patterns on the canvas.
 */
import {
  setupAgent,
  ensureFunded,
  readCanvas,
  placePixel,
  sleep,
  randomInt,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  type RGB,
} from "./common";

// ─── Templates ──────────────────────────────────────────────────────────────

const HEART: number[][] = [
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

const SMILEY: number[][] = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [1, 0, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

const STAR: number[][] = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 1, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1],
];

const ARROW: number[][] = [
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
];

const DIAMOND: number[][] = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
];

interface Template {
  name: string;
  data: number[][];
  color: RGB;
}

const TEMPLATES: Template[] = [
  { name: "heart", data: HEART, color: [255, 50, 80] },
  { name: "smiley", data: SMILEY, color: [255, 220, 0] },
  { name: "star", data: STAR, color: [255, 165, 0] },
  { name: "arrow", data: ARROW, color: [0, 200, 255] },
  { name: "diamond", data: DIAMOND, color: [180, 0, 255] },
];

// ─── Math Patterns ──────────────────────────────────────────────────────────

function* spiralPattern(
  centerX: number,
  centerY: number,
  color: RGB
): Generator<{ x: number; y: number; color: RGB }> {
  let angle = 0;
  let radius = 0;
  for (let i = 0; i < 60; i++) {
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
      yield { x, y, color };
    }
    angle += 0.5;
    radius += 0.3;
  }
}

function* checkerboardPattern(
  startX: number,
  startY: number,
  size: number,
  color: RGB
): Generator<{ x: number; y: number; color: RGB }> {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      if ((dx + dy) % 2 === 0) {
        const x = startX + dx;
        const y = startY + dy;
        if (x < CANVAS_WIDTH && y < CANVAS_HEIGHT) {
          yield { x, y, color };
        }
      }
    }
  }
}

function* borderFrame(color: RGB): Generator<{ x: number; y: number; color: RGB }> {
  for (let x = 0; x < CANVAS_WIDTH; x++) {
    yield { x, y: 0, color };
    yield { x, y: CANVAS_HEIGHT - 1, color };
  }
  for (let y = 1; y < CANVAS_HEIGHT - 1; y++) {
    yield { x: 0, y, color };
    yield { x: CANVAS_WIDTH - 1, y, color };
  }
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

async function main() {
  const ctx = await setupAgent("picasso");
  await ensureFunded(ctx);

  let templateIdx = 0;

  while (true) {
    try {
      const grid = await readCanvas(ctx);

      // Draw template
      const template = TEMPLATES[templateIdx % TEMPLATES.length];
      const maxX = CANVAS_WIDTH - (template.data[0]?.length || 0) - 2;
      const maxY = CANVAS_HEIGHT - template.data.length - 2;
      const offsetX = randomInt(2, Math.max(2, maxX));
      const offsetY = randomInt(2, Math.max(2, maxY));

      console.log(
        `[picasso] Drawing ${template.name} at (${offsetX}, ${offsetY})`
      );

      for (let dy = 0; dy < template.data.length; dy++) {
        for (let dx = 0; dx < template.data[dy].length; dx++) {
          if (template.data[dy][dx] === 0) continue;
          const x = offsetX + dx;
          const y = offsetY + dy;
          if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) continue;

          const current = grid[y][x];
          const [r, g, b] = template.color;
          if (current[0] === r && current[1] === g && current[2] === b) continue;

          const sig = await placePixel(ctx, x, y, r, g, b);
          if (sig) {
            console.log(`[picasso] Placed (${x},${y}) ${template.name}`);
          }
          await sleep(randomInt(4000, 6000));
        }
      }

      templateIdx++;

      // Every 3rd template, do a math pattern
      if (templateIdx % 3 === 0) {
        const patternChoice = randomInt(0, 2);
        let pattern: Generator<{ x: number; y: number; color: RGB }>;

        if (patternChoice === 0) {
          console.log("[picasso] Drawing spiral pattern");
          pattern = spiralPattern(
            randomInt(15, 35),
            randomInt(15, 35),
            [0, 255, 128]
          );
        } else if (patternChoice === 1) {
          console.log("[picasso] Drawing checkerboard pattern");
          pattern = checkerboardPattern(
            randomInt(5, 25),
            randomInt(5, 25),
            10,
            [64, 224, 208]
          );
        } else {
          console.log("[picasso] Drawing border frame");
          pattern = borderFrame([255, 215, 0]);
        }

        for (const p of pattern) {
          const sig = await placePixel(ctx, p.x, p.y, ...p.color);
          if (sig) {
            console.log(`[picasso] Pattern pixel (${p.x},${p.y})`);
          }
          await sleep(randomInt(3000, 5000));
        }
      }

      await sleep(2000);
    } catch (e: any) {
      console.error("[picasso] Error:", e.message?.slice(0, 200));
      await sleep(10000);
    }
  }
}

main().catch(console.error);
