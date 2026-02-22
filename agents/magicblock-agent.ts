/**
 * MagicBlock Agent — Team 0
 * Draws the MagicBlock logo and defends it.
 */
import {
  setupAgent,
  ensureFunded,
  readCanvas,
  placePixel,
  sleep,
  randomInt,
  colorsEqual,
  isRoundActive,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  type RGB,
} from "./common";
import { getTeam } from "./teams";

const TEAM = getTeam(0);
const NAME = "magicblock";

// Canvas position for logo (centered in left-third)
const LOGO_X = 2;
const LOGO_Y = 16;

async function main() {
  const ctx = await setupAgent(NAME, TEAM.id);
  await ensureFunded(ctx);

  const logo = TEAM.logo;
  const color = TEAM.primaryColor;

  console.log(`[${NAME}] Logo size: ${logo[0].length}x${logo.length}, position: (${LOGO_X}, ${LOGO_Y})`);

  let scanCount = 0;
  while (true) {
    try {
      // Check if round is still active every 5 scans
      if (scanCount++ % 5 === 0) {
        const active = await isRoundActive(ctx);
        if (!active) {
          console.log(`[${NAME}] Round ended, shutting down.`);
          process.exit(0);
        }
      }

      const grid = await readCanvas(ctx);

      // Scan logo area and repair any overwritten pixels
      let repaired = 0;
      for (let dy = 0; dy < logo.length; dy++) {
        for (let dx = 0; dx < logo[dy].length; dx++) {
          if (logo[dy][dx] === 0) continue;

          const x = LOGO_X + dx;
          const y = LOGO_Y + dy;
          if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) continue;

          const current = grid[y][x];
          if (colorsEqual(current, color)) continue;

          // Pixel needs repair
          const sig = await placePixel(ctx, x, y, ...color);
          if (sig) {
            repaired++;
            console.log(`[${NAME}] Repaired (${x},${y})`);
          }
          await sleep(randomInt(300, 800));
        }
      }

      if (repaired === 0) {
        console.log(`[${NAME}] Logo intact, idle...`);
      } else {
        console.log(`[${NAME}] Repaired ${repaired} pixels`);
      }

      // Wait before next scan
      await sleep(randomInt(2000, 5000));
    } catch (e: any) {
      console.error(`[${NAME}] Error:`, e.message?.slice(0, 200));
      await sleep(10000);
    }
  }
}

main().catch(console.error);
