/**
 * Packed-color codec — the style model's `ValidColor` strings to the
 * u32 encoding the gpu writes, and back. Lives with animation because
 * interpolation needs channel-level access; `@tsgui/paint` re-exports
 * the readers so the rest of the toolkit imports them unchanged.
 */

/** Parse #rgb/#rgba/#rrggbb/#rrggbbaa into the packed u32 the gpu expects. */
export function parseColor(css: string): number {
  if (css === "transparent") return 0x00000000;

  if (!css.startsWith("#")) {
    // Visible mistake color — wrong-at-a-glance beats silently black.
    return 0xff00ffff;
  }

  let hex = css.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length === 6) hex += "ff";
  if (hex.length !== 8) return 0xff00ffff;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = Number.parseInt(hex.slice(6, 8), 16);

  return (
    (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0
  );
}

/** Scale the alpha channel of a packed color (0–1 factor). */
export function colorWithOpacity(color: number, opacity: number): number {
  const a = Math.round(
    ((color >>> 24) & 255) * Math.max(0, Math.min(1, opacity))
  );
  return ((a << 24) | (color & 0x00ffffff)) >>> 0;
}

/** Format a packed color back to `#rrggbbaa` — the style-model string. */
export function formatPacked(color: number): string {
  const r = (color >>> 0) & 255;
  const g = (color >>> 8) & 255;
  const b = (color >>> 16) & 255;
  const a = (color >>> 24) & 255;
  const byte = (v: number): string => v.toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}${byte(a)}`;
}
