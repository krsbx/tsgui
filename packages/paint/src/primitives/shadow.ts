/**
 * Shadow layer — stacked rounded-rect layers approximate the Gaussian
 * falloff with the existing primitive (flying-pan's documented approach;
 * a Renderer-level blur lands with the SDF spike).
 */
import type { Rect } from "@tsgui/gpu";
import type { ViewStyle } from "@tsgui/layout";
import type { Painter } from "../paint.ts";
import { colorWithOpacity, parseColor } from "../style-resolve.ts";

/**
 * Stacked rounded-rect layers approximate the Gaussian falloff with the
 * existing primitive (flying-pan's documented approach — a Renderer-level
 * blur lands with the SDF pass).
 */
export function paintShadow(
  gpu: Painter,
  rect: Rect,
  style: ViewStyle,
  radius: number | undefined
): void {
  if (!style.boxShadow) return;

  const shadows = Array.isArray(style.boxShadow)
    ? style.boxShadow
    : [style.boxShadow];

  const layers = 4;

  for (const shadow of shadows) {
    const ox = shadow.x ?? 0;
    const oy = shadow.y ?? 0;
    // CSS-ish reach: a blur value extends about half its size beyond the
    // offset rect (the full blur painted a huge halo that swallowed
    // neighboring widgets).
    const extent = (shadow.blur ?? 0) / 2 + (shadow.spread ?? 0);
    const color = parseColor(shadow.color);

    // Outermost first, uniform per-layer alpha: each layer contributes
    // 1/layers of the color so the stacked composite ramps from faint at
    // the edge toward the base alpha at the rect instead of the previous
    // inverted falloff (darkest ring farthest out, ~0.86 composite at
    // the center). The offset applies fully to every layer — layers stay
    // concentric with each other, corners grow with the rect.
    for (let i = layers; i >= 1; i--) {
      const grow = extent * (i / layers);
      gpu.fillRoundedRect({
        x: rect.x + ox - grow,
        y: rect.y + oy - grow,
        w: rect.w + grow * 2,
        h: rect.h + grow * 2,
        radius: (radius ?? 0) + grow,
        color: colorWithOpacity(color, 1 / layers),
      });
    }
  }
}
