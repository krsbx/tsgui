/** Slider handle — the bordered disc both slider painters share. */
import { Metrics, Palette } from "@vulcania/core";
import type { ViewStyle } from "@vulcania/layout";
import { type PaintContext, parseColor } from "@vulcania/paint";
import { HANDLE_SIZE } from "./geometry.ts";

/** Handle style hints a slider's `handleStyle` may carry. */
export interface SliderHandleStyle extends ViewStyle {
  borderWidth?: number;
  borderColor?: string;
}

/** Bordered ring under the surface fill — net stroke = borderWidth/2. */
export function paintSliderHandle(
  ctx: PaintContext,
  x: number,
  y: number,
  handleStyle: SliderHandleStyle = {}
): void {
  const bw = handleStyle.borderWidth ?? Metrics.borderWidth;
  const radius = HANDLE_SIZE / 2;

  ctx.gpu.fillRoundedRect({
    x: x - bw / 2,
    y: y - bw / 2,
    w: HANDLE_SIZE + bw,
    h: HANDLE_SIZE + bw,
    radius: radius + bw / 2,
    color: parseColor(handleStyle.borderColor ?? Palette.border),
  });
  ctx.gpu.fillRoundedRect({
    x,
    y,
    w: HANDLE_SIZE,
    h: HANDLE_SIZE,
    radius,
    color: parseColor(handleStyle.backgroundColor ?? Palette.surface),
  });
}
