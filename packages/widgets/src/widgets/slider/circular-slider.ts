/** CircularSlider painter — track arc, filled arc, handle dot. */
import { Palette } from "@tsgui/core";
import { propsOf } from "@tsgui/core";
import {
  CircularProgressDirection,
  ProgressValueType,
  valueToRatio,
} from "@tsgui/layout";
import {
  parseColor,
  resolveFillColorClamped,
  resolveFont,
  type WidgetPainter,
} from "@tsgui/paint";
import { paintInlineValueLabel } from "../label/paint.ts";
import { HANDLE_SIZE } from "./geometry.ts";
import { paintSliderHandle } from "./slider-handle.ts";
import type { CircularSliderProps } from "./types.ts";

export const paintCircularSlider: WidgetPainter = (ctx, node) => {
  const props = propsOf<CircularSliderProps>(node.widget);
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const value = props.value ?? min;
  const ratio = valueToRatio({ value, min, max });

  const thickness = props.thickness ?? 0.15;
  const startAngle = props.startAngle ?? -Math.PI / 2;
  const sweep = props.sweep ?? Math.PI * 2;
  const dirSign =
    props.direction === CircularProgressDirection.CounterClockwise ? -1 : 1;

  const cx = node.screenX + node.width / 2;
  const cy = node.screenY + node.height / 2;
  const radius = Math.min(node.width, node.height) / 2;
  const innerRadius = radius * (1 - thickness);
  const midRadius = (radius + innerRadius) / 2;

  const trackStyle = props.trackStyle ?? {};
  const filledStyle = props.filledStyle ?? {};
  const handleStyle = props.handleStyle ?? {};

  // Angle at the handle position.
  const handleAngle = startAngle + dirSign * sweep * ratio;

  // Track arc.
  ctx.gpu.fillRing({
    cx,
    cy,
    innerRadius,
    radius,
    startAngle,
    endAngle: startAngle + dirSign * sweep,
    color: parseColor(trackStyle.backgroundColor ?? Palette.surfaceActive),
  });

  // Filled arc — start to the handle.
  ctx.gpu.fillRing({
    cx,
    cy,
    innerRadius,
    radius,
    startAngle,
    endAngle: handleAngle,
    color: parseColor(
      resolveFillColorClamped({
        ratio,
        fillStyle: filledStyle,
        colorStops: props.colorStops,
      })
    ),
  });

  // Handle dot on the ring's mid radius — the shared bordered disc.
  paintSliderHandle(
    ctx,
    cx + Math.cos(handleAngle) * midRadius - HANDLE_SIZE / 2,
    cy + Math.sin(handleAngle) * midRadius - HANDLE_SIZE / 2,
    handleStyle as never
  );

  paintInlineValueLabel(ctx.gpu, resolveFont(ctx, node), {
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
