/**
 * Chaos — The Wildcard
 * Random pixels, random colors. Creates noise and motion.
 */
import {
  setupAgent,
  ensureFunded,
  placePixel,
  sleep,
  randomInt,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  type RGB,
} from "./common";

// Bright, visible palette
const PALETTE: RGB[] = [
  [255, 0, 0],       // Red
  [0, 255, 0],       // Green
  [255, 255, 0],     // Yellow
  [255, 0, 255],     // Magenta
  [0, 255, 255],     // Cyan
  [255, 128, 0],     // Orange
  [128, 0, 255],     // Purple
  [255, 64, 128],    // Hot pink
  [0, 255, 128],     // Spring green
  [255, 200, 0],     // Gold
];

function randomColor(): RGB {
  return PALETTE[randomInt(0, PALETTE.length - 1)];
}

async function main() {
  const ctx = await setupAgent("chaos");
  await ensureFunded(ctx);

  console.log("[chaos] Starting random pixel placement...");

  while (true) {
    try {
      const x = randomInt(0, CANVAS_WIDTH - 1);
      const y = randomInt(0, CANVAS_HEIGHT - 1);
      const [r, g, b] = randomColor();

      const sig = await placePixel(ctx, x, y, r, g, b);
      if (sig) {
        console.log(
          `[chaos] Placed (${x},${y}) rgb(${r},${g},${b})`
        );
      }

      await sleep(randomInt(3000, 6000));
    } catch (e: any) {
      console.error("[chaos] Error:", e.message?.slice(0, 200));
      await sleep(10000);
    }
  }
}

main().catch(console.error);
