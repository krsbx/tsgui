/**
 * Shared fill painters — flying-pan's renderer/paint/fill + color-stop
 * resolution, driven by the structural Painter surface instead of Window.
 */
import type { Rect } from "@tsgui/gpu";
import type { ValidColor, ViewStyle } from "@tsgui/layout";
import { valueToRatio } from "@tsgui/layout";
import { type ColorStop, Palette } from "../design.ts";
import { colorWithOpacity, parseColor } from "../style-resolve.ts";
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

export function resolveFillColor(options: {
  ratio: number;
  fillStyle?: ViewStyle;
  colorStops?: ColorStop[];
}): ValidColor {
  const { ratio, fillStyle, colorStops } = options;

  if (colorStops && colorStops.length > 0) {
    const sorted = [...colorStops].sort((a, b) => a.at - b.at);
    let picked = sorted[0]!.color;

    for (const stop of sorted) {
      if (ratio >= stop.at) picked = stop.color;
      else break;
    }

    return picked;
  }

  return fillStyle?.backgroundColor ?? Palette.accent;
}

export function resolveFillColorClamped(options: {
  ratio: number;
  fillStyle?: ViewStyle;
  colorStops?: ColorStop[];
}): ValidColor {
  const ratio = Math.max(0, Math.min(1, options.ratio));
  return resolveFillColor({
    ratio,
    fillStyle: options.fillStyle,
    colorStops: options.colorStops,
  });
}

export interface ContinuousFillOptions {
  gpu: Painter;
  x: number;
  y: number;
  w: number;
  h: number;
  isHorizontal: boolean;
  isForward: boolean;
  ratio: number;
  fillStyle: ViewStyle;
  /** If set, overrides `fillStyle.backgroundColor` (used by `colorStops`). */
  colorOverride?: ValidColor;
}

/** The value fill of a track — a sub-rect of the track's box. */
export function paintContinuousFill(options: ContinuousFillOptions): void {
  const {
    gpu,
    x,
    y,
    w,
    h,
    isHorizontal,
    isForward,
    ratio,
    fillStyle,
    colorOverride,
  } = options;

  const fillW = isHorizontal ? w * ratio : w;
  const fillH = isHorizontal ? h : h * ratio;
  const fillX = isHorizontal && !isForward ? x + w - fillW : x;
  const fillY = isHorizontal ? y : isForward ? y : y + h - fillH;

  const radius = fillStyle.borderRadius;
  paintBorder(gpu, { x: fillX, y: fillY, w: fillW, h: fillH }, fillStyle, radius);
  const bg = colorOverride ?? fillStyle.backgroundColor ?? Palette.accent;
  paintBackground(
    gpu,
    { x: fillX, y: fillY, w: fillW, h: fillH },
    { ...fillStyle, backgroundColor: bg },
    radius
  );
}

export interface SteppedFillOptions {
  gpu: Painter;
  x: number;
  y: number;
  w: number;
  h: number;
  isHorizontal: boolean;
  isForward: boolean;
  steps: number;
  stepGap: number;
  filledSegments: number;
  fillStyle: ViewStyle;
  /**
   * If provided, each segment is colored by its midpoint ratio (segment `i`
   * of `steps` sits at `(i + 0.5) / steps`).
   */
  colorStops?: ColorStop[];
}

/** N discrete segments with gaps; the first `filledSegments` are filled. */
export function paintSteppedFill(options: SteppedFillOptions): void {
  const {
    gpu,
    x,
    y,
    w,
    h,
    isHorizontal,
    isForward,
    steps,
    stepGap,
    filledSegments,
    fillStyle,
    colorStops,
  } = options;

  // Total extent along the fill axis, minus the gaps between segments.
  const fillAxis = isHorizontal ? w : h;
  const crossAxis = isHorizontal ? h : w;
  const gapTotal = stepGap * (steps - 1);
  const segmentLong = Math.max(0, (fillAxis - gapTotal) / steps);
  const segmentShort = crossAxis;
  const radius = fillStyle.borderRadius;

  for (let i = 0; i < steps; i++) {
    // Forward: low indices fill first. Backward: high indices fill first.
    const isFilled = isForward ? i < filledSegments : i >= steps - filledSegments;
    if (!isFilled) continue; // track background shows through

    const positionAlong = i * (segmentLong + stepGap);
    const segX = isHorizontal ? x + positionAlong : x;
    const segY = isHorizontal ? y : y + positionAlong;
    const segW = isHorizontal ? segmentLong : segmentShort;
    const segH = isHorizontal ? segmentShort : segmentLong;

    // Per-segment color: the midpoint ratio through the color stops.
    const segmentStyle = colorStops
      ? {
          ...fillStyle,
          backgroundColor: resolveFillColorClamped({
            ratio: (i + 0.5) / steps,
            fillStyle,
            colorStops,
          }),
        }
      : fillStyle;

    paintBorder(gpu, { x: segX, y: segY, w: segW, h: segH }, segmentStyle, radius);
    paintBackground(gpu, { x: segX, y: segY, w: segW, h: segH }, segmentStyle, radius);
  }
}

/** Convenience for callers that need the raw ratio of a (value,min,max). */
export function fillRatio(props: { value?: number; min?: number; max?: number }): number {
  return valueToRatio({ value: props.value ?? 0, min: props.min ?? 0, max: props.max ?? 1 });
}
