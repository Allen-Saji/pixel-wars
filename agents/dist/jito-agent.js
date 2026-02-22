"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Jito Agent — Team 2
 * Draws the Jito logo and defends it.
 */
const common_1 = require("./common");
const teams_1 = require("./teams");
const TEAM = (0, teams_1.getTeam)(2);
const NAME = "jito";
// Canvas position for logo (right-third)
const LOGO_X = 32;
const LOGO_Y = 14;
async function main() {
    const ctx = await (0, common_1.setupAgent)(NAME, TEAM.id);
    await (0, common_1.ensureFunded)(ctx);
    const logo = TEAM.logo;
    const color = TEAM.primaryColor;
    console.log(`[${NAME}] Logo size: ${logo[0].length}x${logo.length}, position: (${LOGO_X}, ${LOGO_Y})`);
    let scanCount = 0;
    while (true) {
        try {
            // Check if round is still active every 5 scans
            if (scanCount++ % 5 === 0) {
                const active = await (0, common_1.isRoundActive)(ctx);
                if (!active) {
                    console.log(`[${NAME}] Round ended, shutting down.`);
                    process.exit(0);
                }
            }
            const grid = await (0, common_1.readCanvas)(ctx);
            let repaired = 0;
            for (let dy = 0; dy < logo.length; dy++) {
                for (let dx = 0; dx < logo[dy].length; dx++) {
                    if (logo[dy][dx] === 0)
                        continue;
                    const x = LOGO_X + dx;
                    const y = LOGO_Y + dy;
                    if (x >= common_1.CANVAS_WIDTH || y >= common_1.CANVAS_HEIGHT)
                        continue;
                    const current = grid[y][x];
                    if ((0, common_1.colorsEqual)(current, color))
                        continue;
                    const sig = await (0, common_1.placePixel)(ctx, x, y, ...color);
                    if (sig) {
                        repaired++;
                        console.log(`[${NAME}] Repaired (${x},${y})`);
                    }
                    await (0, common_1.sleep)((0, common_1.randomInt)(300, 800));
                }
            }
            if (repaired === 0) {
                console.log(`[${NAME}] Logo intact, idle...`);
            }
            else {
                console.log(`[${NAME}] Repaired ${repaired} pixels`);
            }
            await (0, common_1.sleep)((0, common_1.randomInt)(2000, 5000));
        }
        catch (e) {
            console.error(`[${NAME}] Error:`, e.message?.slice(0, 200));
            await (0, common_1.sleep)(10000);
        }
    }
}
main().catch(console.error);
