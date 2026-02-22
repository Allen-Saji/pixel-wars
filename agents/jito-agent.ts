/**
 * Jito Agent — Team 2
 * Draws the Jito logo and defends it.
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

const TEAM = getTeam(2);
const NAME = "jito";

// Canvas position for logo (right-third)
const LOGO_X = 32;
const LOGO_Y = 14;

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

      let repaired = 0;
      for (let dy = 0; dy < logo.length; dy++) {
        for (let dx = 0; dx < logo[dy].length; dx++) {
          if (logo[dy][dx] === 0) continue;

          const x = LOGO_X + dx;
          const y = LOGO_Y + dy;
          if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) continue;

          const current = grid[y][x];
          if (colorsEqual(current, color)) continue;

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

      await sleep(randomInt(2000, 5000));
    } catch (e: any) {
      console.error(`[${NAME}] Error:`, e.message?.slice(0, 200));
      await sleep(10000);
    }
  }
}

main().catch(console.error);
