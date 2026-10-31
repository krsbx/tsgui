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

  for (const shadow of shadows) {
    const blur = shadow.blur ?? 0;
    const spread = shadow.spread ?? 0;
    const layers = 3;
    const color = parseColor(shadow.color);

    for (let i = layers; i >= 1; i--) {
      const grow = (blur + spread) * (i / layers);
      gpu.fillRoundedRect({
        x: rect.x + (shadow.x ?? 0) - grow,
        y: rect.y + (shadow.y ?? 0) - grow,
        w: rect.w + grow * 2,
        h: rect.h + grow * 2,
        // Layers stay concentric with the source rect's corners.
        radius: (radius ?? 0) + grow,
        color: colorWithOpacity(color, i / layers),
      });
    }
  }
}
