/** Slider tick marks — border ticks at values, optional labels under. */
import { valueToRatio } from "@tsgui/layout";
import { Palette } from "../design.ts";
import type { PaintContext } from "../paint.ts";
import { parseColor } from "../style-resolve.ts";
import {
  TICK_LABEL_FONT_SIZE,
  TICK_SIZE,
  TRACK_THICKNESS,
} from "../widgets/slider/geometry.ts";
import type { SliderMark } from "../widgets/slider/types.ts";

export interface PaintSliderMarksOptions {
  marks: SliderMark[];
  min: number;
  max: number;
  /** Widget box origin + size (the value axis spans it). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Track origin (the centered thin axis). */
  trackX: number;
  trackY: number;
  isVertical: boolean;
}

export function paintSliderMarks(
  ctx: PaintContext,
  options: PaintSliderMarksOptions
): void {
  const { marks, min, max, x, y, width, height, trackX, trackY, isVertical } =
    options;

  if (marks.length === 0) return;

  for (const mark of marks) {
    if (mark.value < min || mark.value > max) continue;

    const markRatio = valueToRatio({ value: mark.value, min, max });

    if (isVertical) {
      const my = y + (1 - markRatio) * height;

      ctx.gpu.fillRect({
        x: trackX + (TRACK_THICKNESS - TICK_SIZE) / 2,
        y: my - TICK_SIZE / 2,
        w: TICK_SIZE,
        h: TICK_SIZE,
        color: parseColor(Palette.border),
      });

      if (mark.label) {
        ctx.font.draw(ctx.gpu, {
          x: trackX + TRACK_THICKNESS + 2,
          y: my - TICK_LABEL_FONT_SIZE / 2,
          text: mark.label,
          tint: parseColor(Palette.text),
        });
      }
    } else {
      const mx = x + markRatio * width;

      ctx.gpu.fillRect({
        x: mx - TICK_SIZE / 2,
        y: trackY + (TRACK_THICKNESS - TICK_SIZE) / 2,
        w: TICK_SIZE,
        h: TICK_SIZE,
        color: parseColor(Palette.border),
      });

      if (mark.label) {
        ctx.font.draw(ctx.gpu, {
          x: mx - 20,
          y: trackY + TRACK_THICKNESS + 2,
          text: mark.label,
          tint: parseColor(Palette.text),
        });
      }
    }
  }
}
