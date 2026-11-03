/**
 * RangeSlider painter — track, fill between the two handle centers,
 * marks, both handles; ported from flying-pan's paint/slider/range.
 * colorStops sample the midpoint of the range.
 */
import { Palette, propsOf } from "@vulcania/core";
import { ProgressBarOrientation, valueToRatio } from "@vulcania/layout";
import {
  paintBackground,
  resolveFillColorClamped,
  resolveFont,
  type WidgetPainter,
} from "@vulcania/paint";
import { paintInlineValueLabel } from "../label/paint.ts";
import { HANDLE_SIZE, TRACK_THICKNESS } from "./geometry.ts";
import { paintSliderHandle } from "./slider-handle.ts";
import { paintSliderMarks } from "./slider-marks.ts";
import type { RangeSliderProps } from "./types.ts";

export const paintRangeSlider: WidgetPainter = (ctx, node) => {
  const props = propsOf<RangeSliderProps>(node.widget);
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const [low, high] = props.value ?? [min, max];
  const lowRatio = valueToRatio({ value: low, min, max });
  const highRatio = valueToRatio({ value: high, min, max });
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

  const handlePos = (ratio: number): { x: number; y: number } => ({
    x: isVertical
      ? node.screenX + (node.width - HANDLE_SIZE) / 2
      : node.screenX + ratio * (node.width - HANDLE_SIZE),
    y: isVertical
      ? node.screenY + (1 - ratio) * (node.height - HANDLE_SIZE)
      : node.screenY + (node.height - HANDLE_SIZE) / 2,
  });
  const lowHandle = handlePos(lowRatio);
  const highHandle = handlePos(highRatio);

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

  // Active range fill — between the handle centers (they overlap the
  // fill's ends). colorStops sample the range's midpoint ratio.
  const filledX = isVertical ? trackX : lowHandle.x + HANDLE_SIZE / 2;
  const filledY = isVertical ? highHandle.y + HANDLE_SIZE / 2 : trackY;
  const filledW = isVertical
    ? TRACK_THICKNESS
    : Math.max(0, highHandle.x - lowHandle.x);
  const filledH = isVertical
    ? Math.max(0, lowHandle.y - highHandle.y)
    : TRACK_THICKNESS;
  const filledRadius =
    (filledStyle.borderRadius as number | undefined) ?? TRACK_THICKNESS / 2;

  if (filledW > 0 && filledH > 0) {
    paintBackground(
      ctx.gpu,
      { x: filledX, y: filledY, w: filledW, h: filledH },
      {
        borderRadius: filledRadius,
        ...filledStyle,
        backgroundColor: resolveFillColorClamped({
          ratio: (lowRatio + highRatio) / 2,
          fillStyle: filledStyle as never,
          colorStops: props.colorStops,
        }),
      },
      filledRadius
    );
  }

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

  // Two handles — low first, so high paints on top where they meet.
  paintSliderHandle(ctx, lowHandle.x, lowHandle.y, handleStyle as never);
  paintSliderHandle(ctx, highHandle.x, highHandle.y, handleStyle as never);

  paintInlineValueLabel(ctx.gpu, resolveFont(ctx, node), {
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
    label: props.label,
    labelStyle: props.labelStyle,
  });
};
