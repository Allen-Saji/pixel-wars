import {
  CANVAS_DATA_SIZE,
  CANVAS_PLACEMENTS_OFFSET,
  CANVAS_ROUND_OFFSET,
  CANVAS_BUMP_OFFSET,
  CANVAS_PIXELS_OFFSET,
} from "./constants";

export interface CanvasData {
  totalPlacements: number;
  round: number;
  bump: number;
  /** Raw RGB pixel data, row-major. Length = 30000 (100*100*3). */
  pixels: Uint8Array;
}

/** Parse raw canvas account bytes into structured data using DataView (browser-safe). */
export function parseCanvasAccount(data: Uint8Array | Buffer): CanvasData {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Read u64 as two u32s (total_placements fits in Number safely)
  const lo = view.getUint32(CANVAS_PLACEMENTS_OFFSET, true);
  const hi = view.getUint32(CANVAS_PLACEMENTS_OFFSET + 4, true);
  const totalPlacements = lo + hi * 0x100000000;

  return {
    totalPlacements,
    round: view.getUint32(CANVAS_ROUND_OFFSET, true),
    bump: bytes[CANVAS_BUMP_OFFSET],
    pixels: bytes.slice(CANVAS_PIXELS_OFFSET, CANVAS_PIXELS_OFFSET + CANVAS_DATA_SIZE),
  };
}
