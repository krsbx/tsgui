/** ProgressBar painter — buffer, main fill (continuous or stepped), label. */
import { propsOf } from "@tsgui/core";
import {
  type LayoutNode,
  ProgressBarOrientation,
  ProgressDirection,
  ProgressType,
} from "@tsgui/layout";
import {
  fillRatio,
  type PaintContext,
  paintContinuousFill,
  paintSteppedFill,
  resolveFillColorClamped,
  type WidgetPainter,
} from "@tsgui/paint";
import { paintInlineValueLabel } from "../../label/paint.ts";
import type { ProgressBarProps } from "../types.ts";

/**
 * Indeterminate motion needs a clock, which arrives with phase 4's
 * AnimationManager. Until then it paints a static third-width segment.
 */
function paintIndeterminate(ctx: PaintContext, node: LayoutNode): void {
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

export const paintProgressBar: WidgetPainter = (ctx, node) => {
  const props = propsOf<ProgressBarProps>(node.widget);

  if (props.type === ProgressType.Indeterminate) {
    paintIndeterminate(ctx, node);
    return;
  }

  const isHorizontal = props.orientation !== ProgressBarOrientation.Vertical;
  const isForward = props.direction !== ProgressDirection.Backward;
  const ratio = fillRatio(props);
  const steps = props.steps ?? 0;
  const fillStyle = props.fillStyle ?? {};

  const bufRatio = fillRatio({
    value: props.buffer,
    min: props.min,
    max: props.max,
  });

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
        ? resolveFillColorClamped({
            ratio,
            fillStyle,
            colorStops: props.colorStops,
          })
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
};
