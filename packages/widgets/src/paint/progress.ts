/** Progress painters — ported from flying-pan's renderer/paint/progress. */
import type { LayoutNode } from "@tsgui/layout";
import {
  CircularProgressDirection,
  ProgressDirection,
  ProgressType,
  ProgressBarOrientation,
} from "@tsgui/layout";
import { Palette } from "../design.ts";
import { colorWithOpacity, parseColor } from "../style-resolve.ts";
import type { PaintContext } from "../paint.ts";
import { propsOf } from "../types.ts";
import type {
  CircularProgressProps,
  ProgressBarProps,
} from "../widgets/progress.ts";
import {
  fillRatio,
  paintContinuousFill,
  paintSteppedFill,
  resolveFillColorClamped,
} from "./fill.ts";
import { paintInlineValueLabel } from "./label.ts";

/** CSS color string + opacity → packed u32 for the arc primitives. */
function packedWithOpacity(
  color: string | undefined,
  opacity: number | undefined
): number {
  return colorWithOpacity(parseColor(color ?? Palette.accent), opacity ?? 1);
}

/**
 * Indeterminate motion needs a clock, which arrives with phase 4's
 * AnimationManager. Until then it paints a static third-width segment.
 */
function paintIndeterminateBar(ctx: PaintContext, node: LayoutNode): void {
  paintContinuousFill({
    gpu: ctx.gpu,
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
    isHorizontal: true,
    isForward: true,
    ratio: 1 / 3,
    fillStyle: (node.widget.props as ProgressBarProps).fillStyle ?? {},
  });
}

function paintIndeterminateRing(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<CircularProgressProps>(node.widget);
  const radius = Math.min(node.width, node.height) / 2;
  const thickness = props.thickness ?? 0.1;

  ctx.gpu.fillRing({
    cx: node.screenX + node.width / 2,
    cy: node.screenY + node.height / 2,
    innerRadius: radius * (1 - thickness),
    radius,
    startAngle: 0,
    endAngle: Math.PI * 2 * (1 / 3),
    color: packedWithOpacity(Palette.accent, 1),
  });
}

export function paintProgressBar(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<ProgressBarProps>(node.widget);

  if (props.type === ProgressType.Indeterminate) {
    paintIndeterminateBar(ctx, node);
    return;
  }

  const isHorizontal = props.orientation !== ProgressBarOrientation.Vertical;
  const isForward = props.direction !== ProgressDirection.Backward;
  const ratio = fillRatio(props);
  const steps = props.steps ?? 0;
  const fillStyle = props.fillStyle ?? {};

  const bufRatio = fillRatio({ value: props.buffer, min: props.min, max: props.max });

  if (bufRatio > 0) {
    const bufferStyle = {
      ...fillStyle,
      opacity: props.bufferStyle?.opacity ?? 0.35,
      ...props.bufferStyle,
    };

    if (steps > 1) {
      paintSteppedFill({
        gpu: ctx.gpu,
        x: node.screenX,
        y: node.screenY,
        w: node.width,
        h: node.height,
        isHorizontal,
        isForward,
        steps,
        stepGap: props.stepGap ?? 2,
        filledSegments: Math.round(bufRatio * steps),
        fillStyle: bufferStyle,
      });
    } else {
      paintContinuousFill({
        gpu: ctx.gpu,
        x: node.screenX,
        y: node.screenY,
        w: node.width,
        h: node.height,
        isHorizontal,
        isForward,
        ratio: bufRatio,
        fillStyle: bufferStyle,
      });
    }
  }

  if (steps > 1) {
    paintSteppedFill({
      gpu: ctx.gpu,
      x: node.screenX,
      y: node.screenY,
      w: node.width,
      h: node.height,
      isHorizontal,
      isForward,
      steps,
      stepGap: props.stepGap ?? 2,
      filledSegments: Math.round(ratio * steps),
      fillStyle,
      colorStops: props.colorStops,
    });
  } else {
    paintContinuousFill({
      gpu: ctx.gpu,
      x: node.screenX,
      y: node.screenY,
      w: node.width,
      h: node.height,
      isHorizontal,
      isForward,
      ratio,
      fillStyle,
      colorOverride: props.colorStops
        ? resolveFillColorClamped({ ratio, fillStyle, colorStops: props.colorStops })
        : undefined,
    });
  }

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
}

export function paintCircularProgress(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<CircularProgressProps>(node.widget);

  if (props.type === ProgressType.Indeterminate) {
    paintIndeterminateRing(ctx, node);
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

  const bufRatio = fillRatio({ value: props.buffer, min: props.min, max: props.max });

  if (bufRatio > 0) {
    const bufferColor = props.bufferStyle?.backgroundColor ?? fillStyle.backgroundColor;
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
  if (thickness >= 1) {
    ctx.gpu.fillArc({
      cx,
      cy,
      radius,
      startAngle,
      endAngle: startAngle + directionSign * Math.PI * 2 * ratio,
      color: packedWithOpacity(mainColor, fillStyle.opacity),
    });
  } else {
    ctx.gpu.fillRing({
      cx,
      cy,
      innerRadius,
      radius,
      startAngle,
      endAngle: startAngle + directionSign * Math.PI * 2 * ratio,
      color: packedWithOpacity(mainColor, fillStyle.opacity),
    });
  }

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
}
