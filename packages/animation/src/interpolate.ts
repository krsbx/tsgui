/**
 * Style-value interpolation — ported from flying-pan's
 * animation/interpolate, adapted to vulcania's packed-u32 colors: the
 * result formats back to `#rrggbbaa`, the only color form painters
 * parse.
 */
import { formatPacked, parseColor } from "./color.ts";

/** Interpolate between two style values (number or color string). */
export function interpolate(
  from: string | number,
  to: string | number,
  t: number
): string | number {
  if (typeof from === "number" && typeof to === "number") {
    return from + (to - from) * t;
  }

  const a = parseColor(String(from));
  const b = parseColor(String(to));

  const lerp = (x: number, y: number): number => x + (y - x) * t;
  const r = Math.round(lerp(a & 255, b & 255));
  const g = Math.round(lerp((a >>> 8) & 255, (b >>> 8) & 255));
  const bl = Math.round(lerp((a >>> 16) & 255, (b >>> 16) & 255));
  const al = Math.round(lerp((a >>> 24) & 255, (b >>> 24) & 255));

  return formatPacked(((al << 24) | (bl << 16) | (g << 8) | r) >>> 0);
}
