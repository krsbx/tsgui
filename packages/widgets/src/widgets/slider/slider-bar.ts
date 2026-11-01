/** SliderBar painter — track, fill, marks, handle; ported from flying-pan. */
import { Palette } from "@tsgui/core";
import { propsOf } from "@tsgui/core";
import {
  ProgressBarOrientation,
  ProgressValueType,
  valueToRatio,
} from "@tsgui/layout";
import {
  paintBackground,
  resolveFillColorClamped,
  type WidgetPainter,
} from "@tsgui/paint";
import { paintInlineValueLabel } from "../label/paint.ts";
import { HANDLE_SIZE, TRACK_THICKNESS } from "./geometry.ts";
import { paintSliderHandle } from "./slider-handle.ts";
import { paintSliderMarks } from "./slider-marks.ts";
import type { SliderBarProps } from "./types.ts";

export const paintSliderBar: WidgetPainter = (ctx, node) => {
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
};
