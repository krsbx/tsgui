/** CircularProgress painter — buffer arc, main arc (ring or pie), label. */
import { Palette } from "@tsgui/core";
import { propsOf } from "@tsgui/core";
import {
  CircularProgressDirection,
  ProgressType,
} from "@tsgui/layout";
import {
  colorWithOpacity,
  fillRatio,
  parseColor,
  resolveFillColorClamped,
  type WidgetPainter,
} from "@tsgui/paint";
import { paintInlineValueLabel } from "../../label/paint.ts";
import type { CircularProgressProps } from "../types.ts";
import { paintIndeterminateCircular } from "./indeterminate.ts";

/** CSS color string + opacity → packed u32 for the arc primitives. */
function packedWithOpacity(
  color: string | undefined,
  opacity: number | undefined
): number {
  return colorWithOpacity(parseColor(color ?? Palette.accent), opacity ?? 1);
}

export const paintCircularProgress: WidgetPainter = (ctx, node) => {
  const props = propsOf<CircularProgressProps>(node.widget);

  if (props.type === ProgressType.Indeterminate) {
    paintIndeterminateCircular(ctx, node);
    return;
  }

  const ratio = fillRatio(props);
  const cx = node.screenX + node.width / 2;
  const cy = node.screenY + node.height / 2;
  const radius = Math.min(node.width, node.height) / 2;

  const startAngle = props.startAngle ?? -Math.PI / 2;
  const directionSign =
    props.direction === CircularProgressDirection.CounterClockwise ? -1 : 1;

  const fillStyle = props.fillStyle ?? {};
  const thickness = props.thickness ?? 0.1;
  const innerRadius = radius * (1 - thickness);

  const bufRatio = fillRatio({
    value: props.buffer,
    min: props.min,
    max: props.max,
  });

  if (bufRatio > 0) {
    const bufferColor =
      props.bufferStyle?.backgroundColor ?? fillStyle.backgroundColor;
    const bufferOpacity = props.bufferStyle?.opacity ?? 0.35;

    ctx.gpu.fillRing({
      cx,
      cy,
      innerRadius,
      radius,
      startAngle,
      endAngle: startAngle + directionSign * Math.PI * 2 * bufRatio,
      color: packedWithOpacity(bufferColor, bufferOpacity),
    });
  }

  const mainColor = resolveFillColorClamped({
    ratio,
    fillStyle,
    colorStops: props.colorStops,
  });

  // thickness >= 1 consumes the full radius — a pie, not a ring.
  const shape = (endAngle: number, color: number): void => {
    if (thickness >= 1) {
      ctx.gpu.fillArc({ cx, cy, radius, startAngle, endAngle, color });
    } else {
      ctx.gpu.fillRing({
        cx,
        cy,
        innerRadius,
        radius,
        startAngle,
        endAngle,
        color,
      });
    }
  };

  shape(
    startAngle + directionSign * Math.PI * 2 * ratio,
    packedWithOpacity(mainColor, fillStyle.opacity)
  );

  paintInlineValueLabel(ctx.gpu, ctx.font, {
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
    label: props.label,
    labelStyle: props.labelStyle,
    value: props.value,
    min: props.min,
    max: props.max,
    showValue: props.showValue,
  });
};
