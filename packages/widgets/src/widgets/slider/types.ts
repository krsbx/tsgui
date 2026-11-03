/** Slider contracts — ported from flying-pan's widget/slider/types. */
import type { BaseWidgetProps, ColorStop } from "@vulcania/core";
import type {
  ProgressBarOrientation,
  TextStyle,
  ViewStyle,
} from "@vulcania/layout";
import { CircularProgressDirection } from "@vulcania/layout";

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

/**
 * RangeSlider — dual-handle range selection (flying-pan's
 * RangeSliderBar). Controlled-only like SliderBar; deliberate
 * divergences from flying-pan: no `defaultValue` (no uncontrolled
 * mode), no `showValue` (flying-pan accepts it and never renders it).
 */
export interface RangeSliderProps extends Omit<
  SliderProps,
  "value" | "onChange" | "showValue"
> {
  /** Controlled [low, high] — handles can meet but never cross. */
  value?: [number, number];
  onChange?(value: [number, number]): void;
  orientation?: ProgressBarOrientation;
  /** Tick marks at values, with optional labels. */
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
