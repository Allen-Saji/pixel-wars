/**
 * Defender — The Territorial
 * Claims a quadrant and aggressively maintains it.
 */
import {
  setupAgent,
  ensureFunded,
  readCanvas,
  placePixel,
  sleep,
  colorsEqual,
  randomInt,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  type RGB,
} from "./common";

// Defender claims top-left quadrant (0-24, 0-24)
const QUADRANT = {
  x1: 0,
  y1: 0,
  x2: 24,
  y2: 24,
};

const MY_COLOR: RGB = [0, 100, 255]; // Blue territory
const BORDER_COLOR: RGB = [0, 50, 200]; // Darker blue border

async function main() {
  const ctx = await setupAgent("defender");
  await ensureFunded(ctx);

  console.log(
    `[defender] Defending quadrant (${QUADRANT.x1},${QUADRANT.y1}) to (${QUADRANT.x2},${QUADRANT.y2})`
  );
  console.log(`[defender] Territory color: rgb(${MY_COLOR.join(",")})`);

  let expansionStep = 0;

  while (true) {
    try {
      const grid = await readCanvas(ctx);

      // Phase 1: Find enemy pixels in our territory
      const enemies: { x: number; y: number }[] = [];

      for (let y = QUADRANT.y1; y <= QUADRANT.y2; y++) {
        for (let x = QUADRANT.x1; x <= QUADRANT.x2; x++) {
          const pixel = grid[y][x];
          // Skip if already our color or black (unclaimed)
          if (colorsEqual(pixel, MY_COLOR)) continue;
          if (colorsEqual(pixel, BORDER_COLOR)) continue;
          if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) continue;

          enemies.push({ x, y });
        }
      }

      if (enemies.length > 0) {
        // Prioritize edges of territory (border defense)
        enemies.sort((a, b) => {
          const aEdge =
            a.x === QUADRANT.x1 ||
            a.x === QUADRANT.x2 ||
            a.y === QUADRANT.y1 ||
            a.y === QUADRANT.y2;
          const bEdge =
            b.x === QUADRANT.x1 ||
            b.x === QUADRANT.x2 ||
            b.y === QUADRANT.y1 ||
            b.y === QUADRANT.y2;
          if (aEdge && !bEdge) return -1;
          if (!aEdge && bEdge) return 1;
          return 0;
        });

        console.log(`[defender] ${enemies.length} enemy pixels detected, defending!`);

        // Overwrite up to 5 enemy pixels per scan
        const batch = enemies.slice(0, 5);
        for (const enemy of batch) {
          const sig = await placePixel(ctx, enemy.x, enemy.y, ...MY_COLOR);
          if (sig) {
            console.log(`[defender] Reclaimed (${enemy.x},${enemy.y})`);
          }
          await sleep(randomInt(4000, 6000));
        }
      } else {
        // Phase 2: Territory is secure — paint unclaimed black pixels
        const unclaimed: { x: number; y: number }[] = [];

        for (let y = QUADRANT.y1; y <= QUADRANT.y2; y++) {
          for (let x = QUADRANT.x1; x <= QUADRANT.x2; x++) {
            const pixel = grid[y][x];
            if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
              unclaimed.push({ x, y });
            }
          }
        }

        if (unclaimed.length > 0) {
          console.log(`[defender] Filling ${unclaimed.length} unclaimed pixels`);
          // Fill border first, then interior
          unclaimed.sort((a, b) => {
            const aEdge =
              a.x === QUADRANT.x1 ||
              a.x === QUADRANT.x2 ||
              a.y === QUADRANT.y1 ||
              a.y === QUADRANT.y2;
            const bEdge =
              b.x === QUADRANT.x1 ||
              b.x === QUADRANT.x2 ||
              b.y === QUADRANT.y1 ||
              b.y === QUADRANT.y2;
            if (aEdge && !bEdge) return -1;
            if (!aEdge && bEdge) return 1;
            return 0;
          });

          const batch = unclaimed.slice(0, 3);
          for (const p of batch) {
            const isBorder =
              p.x === QUADRANT.x1 ||
              p.x === QUADRANT.x2 ||
              p.y === QUADRANT.y1 ||
              p.y === QUADRANT.y2;
            const color = isBorder ? BORDER_COLOR : MY_COLOR;
            const sig = await placePixel(ctx, p.x, p.y, ...color);
            if (sig) {
              console.log(`[defender] Filled (${p.x},${p.y})`);
            }
            await sleep(randomInt(4000, 7000));
          }
        } else {
          // Phase 3: Territory fully claimed — try expanding border by 1
          console.log("[defender] Territory secure. Expanding...");
          expansionStep++;

          // Expand one pixel outward on a random edge
          const edge = expansionStep % 4;
          let ex: number, ey: number;

          if (edge === 0 && QUADRANT.x2 + 1 < CANVAS_WIDTH) {
            ex = QUADRANT.x2 + 1;
            ey = randomInt(QUADRANT.y1, QUADRANT.y2);
          } else if (edge === 1 && QUADRANT.y2 + 1 < CANVAS_HEIGHT) {
            ex = randomInt(QUADRANT.x1, QUADRANT.x2);
            ey = QUADRANT.y2 + 1;
          } else if (edge === 2 && QUADRANT.x1 - 1 >= 0) {
            ex = QUADRANT.x1 - 1;
            ey = randomInt(QUADRANT.y1, QUADRANT.y2);
          } else if (edge === 3 && QUADRANT.y1 - 1 >= 0) {
            ex = randomInt(QUADRANT.x1, QUADRANT.x2);
            ey = QUADRANT.y1 - 1;
          } else {
            ex = randomInt(QUADRANT.x1, QUADRANT.x2);
            ey = randomInt(QUADRANT.y1, QUADRANT.y2);
          }

          const sig = await placePixel(ctx, ex, ey, ...BORDER_COLOR);
          if (sig) {
            console.log(`[defender] Expanded to (${ex},${ey})`);
          }
          await sleep(randomInt(5000, 8000));
        }
      }

      await sleep(randomInt(2000, 4000));
    } catch (e: any) {
      console.error("[defender] Error:", e.message?.slice(0, 200));
      await sleep(10000);
    }
  }
}

main().catch(console.error);
