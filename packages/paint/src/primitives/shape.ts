/**
 * Walk primitives — the border/background layers every widget's paint
 * composes, flying-pan's renderer/paint/utility. Border first, then the
 * background over its inner half: net stroke = borderWidth/2.
 */
import { colorWithOpacity, parseColor } from "@tsgui/animation";
import type { Rect } from "@tsgui/gpu";
import type { ViewStyle } from "@tsgui/layout";
import type { Painter } from "../paint.ts";

/**
 * One shape for both corner paths — square `fillRect` when no radius,
 * concentric rounded fan otherwise. Border and background share it.
 */
export function fillShape(
  gpu: Painter,
  rect: Rect,
  radius: number | undefined,
  color: number
): void {
  if (radius && radius > 0) {
    gpu.fillRoundedRect({ ...rect, radius, color });
  } else {
    gpu.fillRect({ ...rect, color });
  }
}

/** Fill-only ring: a slightly larger shape in the border color, painted first. */
export function paintBorder(
  gpu: Painter,
  rect: Rect,
  style: ViewStyle,
  radius: number | undefined
): void {
  const bw = style.borderWidth;
  if (!bw || !style.borderColor) return;

  fillShape(
    gpu,
    {
      x: rect.x - bw / 2,
      y: rect.y - bw / 2,
      w: rect.w + bw,
      h: rect.h + bw,
    },
    radius ? radius + bw / 2 : undefined,
    parseColor(style.borderColor)
  );
  // The background paints over the inner half of the border — net stroke = bw/2.
}

export function paintBackground(
  gpu: Painter,
  rect: Rect,
  style: ViewStyle,
  radius: number | undefined
): void {
  if (!style.backgroundColor) return;

  fillShape(
    gpu,
    rect,
    radius,
    colorWithOpacity(parseColor(style.backgroundColor), style.opacity ?? 1)
  );
}
