/** CircularSlider painter — track arc, filled arc, handle dot. */
import {
  CircularProgressDirection,
  ProgressValueType,
  valueToRatio,
  type LayoutNode,
} from "@tsgui/layout";
import { Palette } from "../design.ts";
import { parseColor } from "../style-resolve.ts";
import type { PaintContext } from "../paint.ts";
import { resolveFillColorClamped } from "./fill.ts";
import { paintInlineValueLabel } from "./label.ts";
import { HANDLE_SIZE } from "../widgets/slider/geometry.ts";
import { propsOf } from "../types.ts";
import type { CircularSliderProps } from "../widgets/slider/types.ts";

export function paintCircularSlider(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<CircularSliderProps>(node.widget);
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const value = props.value ?? min;
  const ratio = valueToRatio({ value, min, max });

  const thickness = props.thickness ?? 0.15;
  const startAngle = props.startAngle ?? -Math.PI / 2;
  const sweep = props.sweep ?? Math.PI * 2;
  const dirSign =
    props.direction === CircularProgressDirection.CounterClockwise
      ? -1
      : 1;

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

  // Handle dot on the ring's mid radius — border ring first, surface
  // fill over its inner half (net stroke = borderWidth/2).
  const hx = cx + Math.cos(handleAngle) * midRadius - HANDLE_SIZE / 2;
  const hy = cy + Math.sin(handleAngle) * midRadius - HANDLE_SIZE / 2;
  const bw = handleStyle.borderWidth ?? 0;

  if (bw) {
    ctx.gpu.fillRoundedRect({
      x: hx - bw / 2,
      y: hy - bw / 2,
      w: HANDLE_SIZE + bw,
      h: HANDLE_SIZE + bw,
      radius: HANDLE_SIZE / 2 + bw / 2,
      color: parseColor(handleStyle.borderColor ?? Palette.border),
    });
  }
  ctx.gpu.fillRoundedRect({
    x: hx,
    y: hy,
    w: HANDLE_SIZE,
    h: HANDLE_SIZE,
    radius: HANDLE_SIZE / 2,
    color: parseColor(handleStyle.backgroundColor ?? Palette.surface),
  });

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
