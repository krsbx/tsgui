/** SliderBar painter — track, fill, marks, handle; ported from flying-pan. */
import { ProgressBarOrientation, valueToRatio, type LayoutNode } from "@tsgui/layout";
import { Metrics, Palette } from "../design.ts";
import { parseColor } from "../style-resolve.ts";
import type { PaintContext } from "../paint.ts";
import { paintBackground, paintBorder, resolveFillColorClamped } from "./fill.ts";
import { paintInlineValueLabel } from "./label.ts";
import {
  HANDLE_SIZE,
  TICK_LABEL_FONT_SIZE,
  TICK_SIZE,
  TRACK_THICKNESS,
} from "../widgets/slider/geometry.ts";
import type { SliderMark } from "../widgets/slider/types.ts";
import { propsOf } from "../types.ts";
import type { SliderBarProps } from "../widgets/slider/types.ts";

export function paintSliderBar(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<SliderBarProps>(node.widget);
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const value = props.value ?? min;
  const ratio = valueToRatio({ value, min, max });
  const isVertical = props.orientation === ProgressBarOrientation.Vertical;

  const trackStyle = { ...props.trackStyle } as Record<string, unknown>;
  const filledStyle = { ...props.filledStyle } as Record<string, unknown>;
  const handleStyle = { ...props.handleStyle } as Record<string, unknown>;

  const trackX = isVertical ? node.screenX + (node.width - TRACK_THICKNESS) / 2 : node.screenX;
  const trackY = isVertical ? node.screenY : node.screenY + (node.height - TRACK_THICKNESS) / 2;
  const trackW = isVertical ? TRACK_THICKNESS : node.width;
  const trackH = isVertical ? node.height : TRACK_THICKNESS;

  const handleX = isVertical
    ? node.screenX + (node.width - HANDLE_SIZE) / 2
    : node.screenX + ratio * (node.width - HANDLE_SIZE);
  const handleY = isVertical
    ? node.screenY + (1 - ratio) * (node.height - HANDLE_SIZE)
    : node.screenY + (node.height - HANDLE_SIZE) / 2;

  // Track
  paintBackground(
    ctx.gpu,
    { x: trackX, y: trackY, w: trackW, h: trackH },
    {
      backgroundColor: Palette.surfaceActive,
      borderRadius: TRACK_THICKNESS / 2,
      ...trackStyle,
    },
    (trackStyle.borderRadius as number | undefined) ?? TRACK_THICKNESS / 2
  );

  // Filled portion — from track start to the handle's center.
  const filledX = isVertical ? trackX : node.screenX;
  const filledY = isVertical ? handleY + HANDLE_SIZE / 2 : trackY;
  const filledW = isVertical ? TRACK_THICKNESS : handleX - node.screenX + HANDLE_SIZE / 2;
  const filledH = isVertical ? node.screenY + node.height - filledY : TRACK_THICKNESS;
  const filledRadius = (filledStyle.borderRadius as number | undefined) ?? TRACK_THICKNESS / 2;

  paintBackground(
    ctx.gpu,
    { x: filledX, y: filledY, w: filledW, h: filledH },
    {
      borderRadius: filledRadius,
      ...filledStyle,
      backgroundColor: resolveFillColorClamped({
        ratio,
        fillStyle: filledStyle as never,
        colorStops: props.colorStops,
      }),
    },
    filledRadius
  );

  paintSliderMarks(ctx, node, props.marks ?? [], min, max, trackX, trackY, isVertical);

  // Handle — a bordered disc centered on the value's position.
  paintBorder(
    ctx.gpu,
    { x: handleX, y: handleY, w: HANDLE_SIZE, h: HANDLE_SIZE },
    {
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      borderRadius: HANDLE_SIZE / 2,
      ...handleStyle,
    },
    HANDLE_SIZE / 2
  );
  paintBackground(
    ctx.gpu,
    { x: handleX, y: handleY, w: HANDLE_SIZE, h: HANDLE_SIZE },
    {
      backgroundColor: Palette.surface,
      borderRadius: HANDLE_SIZE / 2,
      ...handleStyle,
    },
    HANDLE_SIZE / 2
  );

  paintInlineValueLabel(ctx.gpu, ctx.font, {
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
    label: props.label,
    labelStyle: props.labelStyle,
    value,
    min,
    max,
    showValue: props.showValue ? "percent" : undefined,
  });
}

function paintSliderMarks(
  ctx: PaintContext,
  node: LayoutNode,
  marks: SliderMark[],
  min: number,
  max: number,
  trackX: number,
  trackY: number,
  isVertical: boolean
): void {
  if (marks.length === 0) return;

  for (const mark of marks) {
    if (mark.value < min || mark.value > max) continue;

    const markRatio = valueToRatio({ value: mark.value, min, max });

    if (isVertical) {
      const my = node.screenY + (1 - markRatio) * node.height;

      paintBackground(
        ctx.gpu,
        {
          x: trackX + (TRACK_THICKNESS - TICK_SIZE) / 2,
          y: my - TICK_SIZE / 2,
          w: TICK_SIZE,
          h: TICK_SIZE,
        },
        { backgroundColor: Palette.border },
        0
      );

      if (mark.label) {
        ctx.font.draw(ctx.gpu, {
          x: trackX + TRACK_THICKNESS + 2,
          y: my - TICK_LABEL_FONT_SIZE / 2,
          text: mark.label,
          tint: parseColor(Palette.text),
        });
      }
    } else {
      const mx = node.screenX + markRatio * node.width;

      paintBackground(
        ctx.gpu,
        {
          x: mx - TICK_SIZE / 2,
          y: trackY + (TRACK_THICKNESS - TICK_SIZE) / 2,
          w: TICK_SIZE,
          h: TICK_SIZE,
        },
        { backgroundColor: Palette.border },
        0
      );

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
