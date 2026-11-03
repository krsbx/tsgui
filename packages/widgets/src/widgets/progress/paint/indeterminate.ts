/**
 * Indeterminate progress motion — ported from flying-pan's
 * renderer/paint/progress/indeterminate. Both painters take their phase
 * from the AnimationManager clock through PaintContext (`time`); without
 * a manager they paint the static mid-cycle frame.
 */
import { easings } from "@vulcania/animation";
import { Palette, propsOf } from "@vulcania/core";
import {
  CircularProgressDirection,
  EasingName,
  type LayoutNode,
  ProgressBarOrientation,
  ProgressDirection,
} from "@vulcania/layout";
import { type PaintContext, parseColor } from "@vulcania/paint";
import type { CircularProgressProps, ProgressBarProps } from "../types.ts";

const INDETERMINATE_BAR_DURATION = 1500;
const INDETERMINATE_CIRCULAR_DURATION = 2000;
const INDETERMINATE_SEGMENT = 0.4;
const INDETERMINATE_SWEEP = Math.PI * 1.5;

export function paintIndeterminateBar(
  ctx: PaintContext,
  node: LayoutNode
): void {
  const props = propsOf<ProgressBarProps>(node.widget);

  const time = ctx.animationManager?.time ?? 750;
  const cycle =
    (time % INDETERMINATE_BAR_DURATION) / INDETERMINATE_BAR_DURATION;
  const eased = easings[EasingName.EaseInOut](cycle);

  const isHorizontal = props.orientation !== ProgressBarOrientation.Vertical;
  const isForward = props.direction !== ProgressDirection.Backward;

  const trackSize = isHorizontal ? node.width : node.height;
  const segSize = trackSize * INDETERMINATE_SEGMENT;
  const travel = trackSize + segSize;

  const segStart = isForward
    ? eased * travel - segSize
    : trackSize - eased * travel;

  const visStart = Math.max(segStart, 0);
  const visEnd = Math.min(segStart + segSize, trackSize);
  const visSize = visEnd - visStart;

  if (visSize <= 0) return;

  const fillStyle = { backgroundColor: Palette.accent, ...props.fillStyle };
  ctx.gpu.fillRect({
    x: isHorizontal ? node.screenX + visStart : node.screenX,
    y: isHorizontal ? node.screenY : node.screenY + visStart,
    w: isHorizontal ? visSize : node.width,
    h: isHorizontal ? node.height : visSize,
    color: parseColor(fillStyle.backgroundColor ?? Palette.accent),
  });
}

export function paintIndeterminateCircular(
  ctx: PaintContext,
  node: LayoutNode
): void {
  const props = propsOf<CircularProgressProps>(node.widget);

  const time = ctx.animationManager?.time ?? 1000;
  const cycle =
    (time % INDETERMINATE_CIRCULAR_DURATION) / INDETERMINATE_CIRCULAR_DURATION;

  const dirSign =
    props.direction === CircularProgressDirection.CounterClockwise ? -1 : 1;
  const startAngle = props.startAngle ?? -Math.PI / 2;

  const arcStart = startAngle + dirSign * cycle * Math.PI * 2;
  const arcEnd = arcStart + dirSign * INDETERMINATE_SWEEP;

  const radius = Math.min(node.width, node.height) / 2;
  const thickness = props.thickness ?? 0.1;
  const fillStyle = props.fillStyle ?? {};
  const color = fillStyle.backgroundColor ?? Palette.accent;

  ctx.gpu.fillRing({
    cx: node.screenX + node.width / 2,
    cy: node.screenY + node.height / 2,
    innerRadius: radius * (1 - thickness),
    radius,
    startAngle: arcStart,
    endAngle: arcEnd,
    color: parseColor(color),
  });
}
