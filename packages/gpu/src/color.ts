/**
 * Color packing helpers — runtime utilities, kept out of the types-only
 * draw-contract module (see CONVENTIONS.md).
 */
import type { RgbaChannels } from "./types.ts";

/** Pack 0–255 channels into the u32 SDL_Color writes little-endian. */
export function rgba({ r, g, b, a = 255 }: RgbaChannels): number {
  return (
    (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0
  );
}
