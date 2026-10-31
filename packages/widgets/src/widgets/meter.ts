/** Meter — HTML-`<meter>` zone semantics over the shared fill painter. */
import {
  PointerEvents,
  ProgressDirection,
  ProgressBarOrientation,
  ProgressValueType,
  WidgetType,
  type TextStyle,
  type ViewStyle,
} from "@tsgui/layout";
import { Palette } from "../design.ts";
import { createWidget } from "../create-widget.ts";
import type { InteractionProps, Key, ReconcilableWidget } from "../types.ts";

export interface MeterProps extends InteractionProps {
  value?: number;
  min?: number;
  max?: number;
  /** Below `low` is the "low zone" — colored per the optimum's position. */
  low?: number;
  high?: number;
  optimum?: number;
  orientation?: ProgressBarOrientation;
  direction?: ProgressDirection;
  /** Optional text rendered centered on the bar. */
  label?: string;
  labelStyle?: TextStyle;
  /** Auto-compute the label from the value. Explicit `label` wins. */
  showValue?: ProgressValueType;
  style?: ViewStyle;
  fillStyle?: ViewStyle;
  key?: Key;
}

export function Meter(props: MeterProps): ReconcilableWidget {
  const { style, fillStyle, key, ...handlers } = props;

  const orientation = props.orientation ?? ProgressBarOrientation.Horizontal;
  const direction = props.direction ?? ProgressDirection.Forward;
  const isHorizontal = orientation === ProgressBarOrientation.Horizontal;

  return createWidget({
    type: WidgetType.Meter,
    props: {
      value: props.value,
      min: props.min,
      max: props.max,
      low: props.low,
      high: props.high,
      optimum: props.optimum,
      label: props.label,
      labelStyle: props.labelStyle,
      showValue: props.showValue,
      fillStyle: {
        backgroundColor: Palette.accent,
        ...fillStyle,
      },
      orientation,
      direction,
    },
    style: {
      pointerEvents: PointerEvents.None,
      width: isHorizontal ? 48 : 4,
      height: isHorizontal ? 4 : 48,
      backgroundColor: Palette.surfaceActive,
      ...style,
    },
    key,
    handlers,
  });
}
