/** ProgressBar painter — buffer, main fill (continuous or stepped), label. */
import { propsOf } from "@vulcania/core";
import {
  ProgressBarOrientation,
  ProgressDirection,
  ProgressType,
} from "@vulcania/layout";
import {
  fillRatio,
  paintContinuousFill,
  paintSteppedFill,
  resolveFillColorClamped,
  resolveFont,
  type WidgetPainter,
} from "@vulcania/paint";
import { paintInlineValueLabel } from "../../label/paint.ts";
import type { ProgressBarProps } from "../types.ts";
import { paintIndeterminateBar } from "./indeterminate.ts";

export const paintProgressBar: WidgetPainter = (ctx, node) => {
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

  paintInlineValueLabel(ctx.gpu, resolveFont(ctx, node), {
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
