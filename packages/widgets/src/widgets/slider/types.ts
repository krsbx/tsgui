/** Slider contracts — ported from flying-pan's widget/slider/types. */
import type {
  ProgressBarOrientation,
  TextStyle,
  ViewStyle,
} from "@tsgui/layout";
import { CircularProgressDirection } from "@tsgui/layout";
import type { ColorStop } from "@tsgui/core";
import type { BaseWidgetProps } from "@tsgui/core";

export interface SliderMark {
  value: number;
  label?: string;
}

export interface SliderProps extends BaseWidgetProps {
  /** Controlled value — the parent re-renders on change. */
  value?: number;
  min?: number;
  max?: number;
  /** Snap granularity; raw values round to the nearest step. */
  step?: number;
  onChange?(value: number): void;
  disabled?: boolean;
  /**
   * Value-driven fill color — highest stop with `ratio >= at` wins, same
   * as ProgressBar's colorStops.
   */
  colorStops?: ColorStop[];
  /** Optional text rendered centered on the bar. */
  label?: string;
  labelStyle?: TextStyle;
  /** Auto-compute the label from the value. Explicit `label` wins. */
  showValue?: boolean;
  style?: ViewStyle;
  trackStyle?: ViewStyle;
  filledStyle?: ViewStyle;
  handleStyle?: ViewStyle;
}

export interface SliderBarProps extends SliderProps {
  orientation?: ProgressBarOrientation;
  /** Tick marks at values, with optional labels. Bar sliders only. */
  marks?: SliderMark[];
}

export interface CircularSliderProps extends SliderProps {
  /** Diameter in px. */
  size?: number;
  /** Track thickness as a fraction of the radius, in [0, 1]. */
  thickness?: number;
  /** Starting angle in radians. Default −π/2 (top of circle). */
  startAngle?: number;
  /** Angle traversed, in radians. Default 2π. */
  sweep?: number;
  direction?: CircularProgressDirection;
}
