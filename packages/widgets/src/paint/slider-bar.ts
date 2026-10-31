/** SliderBar painter — track, fill, marks, handle; ported from flying-pan. */
import {
  type LayoutNode,
  ProgressBarOrientation,
  ProgressValueType,
  valueToRatio,
} from "@tsgui/layout";
import { Palette } from "../design.ts";
import type { PaintContext } from "../paint.ts";
import { propsOf } from "../types.ts";
import { HANDLE_SIZE, TRACK_THICKNESS } from "../widgets/slider/geometry.ts";
import type { SliderBarProps } from "../widgets/slider/types.ts";
import { resolveFillColorClamped } from "./color-stops.ts";
import { paintInlineValueLabel } from "./label.ts";
import { paintBackground } from "./shape.ts";
import { paintSliderHandle } from "./slider-handle.ts";
import { paintSliderMarks } from "./slider-marks.ts";

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

  const trackX = isVertical
    ? node.screenX + (node.width - TRACK_THICKNESS) / 2
    : node.screenX;
  const trackY = isVertical
    ? node.screenY
    : node.screenY + (node.height - TRACK_THICKNESS) / 2;
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
  const filledW = isVertical
    ? TRACK_THICKNESS
    : handleX - node.screenX + HANDLE_SIZE / 2;
  const filledH = isVertical
    ? node.screenY + node.height - filledY
    : TRACK_THICKNESS;
  const filledRadius =
    (filledStyle.borderRadius as number | undefined) ?? TRACK_THICKNESS / 2;

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

  paintSliderMarks(ctx, {
    marks: props.marks ?? [],
    min,
    max,
    x: node.screenX,
    y: node.screenY,
    width: node.width,
    height: node.height,
    trackX,
    trackY,
    isVertical,
  });

  // Handle — a bordered disc centered on the value's position.
  paintSliderHandle(ctx, handleX, handleY, handleStyle as never);

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
    showValue: props.showValue ? ProgressValueType.Percent : undefined,
  });
}
