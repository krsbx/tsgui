/** Meter painter — HTML-`<meter>` low/high/optimum zones as palette colors. */
import type { LayoutNode } from "@tsgui/layout";
import { ProgressBarOrientation, ProgressDirection } from "@tsgui/layout";
import { MeterZone, Palette } from "../design.ts";
import type { PaintContext } from "../paint.ts";
import { propsOf } from "../types.ts";
import type { MeterProps } from "../widgets/meter.ts";
import { fillRatio, paintContinuousFill } from "./fill.ts";
import { paintInlineValueLabel } from "./label.ts";

/** Which palette zone the value sits in, given the optimum's position. */
export function resolveMeterColor(options: {
  value: number;
  low: number;
  high: number;
  optimum: number;
}): MeterZone {
  const { value, low, high, optimum } = options;

  const optimumInLow = optimum < low;
  const optimumInHigh = optimum > high;

  const valueInLow = value < low;
  const valueInHigh = value > high;
  const valueInMedium = !valueInLow && !valueInHigh;

  if (optimumInLow) {
    if (valueInLow) return MeterZone.Success;
    if (valueInMedium) return MeterZone.Warning;
    return MeterZone.Error;
  }

  if (optimumInHigh) {
    if (valueInHigh) return MeterZone.Success;
    if (valueInMedium) return MeterZone.Warning;
    return MeterZone.Error;
  }

  if (valueInMedium) return MeterZone.Success;
  return MeterZone.Warning;
}

export function paintMeter(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<MeterProps>(node.widget);

  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const low = props.low ?? min + (max - min) / 3;
  const high = props.high ?? min + ((max - min) * 2) / 3;
  const optimum = props.optimum ?? (low + high) / 2;

  const value = props.value ?? min;
  const ratio = fillRatio({ value, min, max });

  const isHorizontal = props.orientation !== ProgressBarOrientation.Vertical;
  const isForward = props.direction !== ProgressDirection.Backward;

  const zoneColor = Palette[resolveMeterColor({ value, low, high, optimum })];

  paintContinuousFill({
    gpu: ctx.gpu,
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
    isHorizontal,
    isForward,
    ratio,
    fillStyle: props.fillStyle ?? {},
    colorOverride: zoneColor,
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
    showValue: props.showValue,
  });
}
