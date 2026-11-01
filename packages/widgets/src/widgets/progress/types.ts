/** Progress contracts — ported from flying-pan's widget/progress/types. */
import type {
  CircularProgressDirection,
  ProgressBarOrientation,
  ProgressDirection,
  ProgressType,
  ProgressValueType,
  TextStyle,
  ViewStyle,
} from "@tsgui/layout";
import type { ColorStop } from "@tsgui/core";
import type { BaseWidgetProps } from "@tsgui/core";

export interface ProgressProps extends BaseWidgetProps {
  value?: number;
  /**
   * Optional secondary "buffer" fill rendered behind the main fill
   * (seek-bar pattern). Same units as `value`, normalized via min/max.
   * Drawn at 0.35 opacity unless `bufferStyle.opacity` is set.
   */
  buffer?: number;
  min?: number;
  max?: number;
  type?: ProgressType;
  /**
   * Value-driven fill color. The stop with the highest `at` where
   * `ratio >= at` wins; sorted defensively.
   */
  colorStops?: ColorStop[];
  /** Optional text rendered centered on the bar. */
  label?: string;
  labelStyle?: TextStyle;
  /** Auto-compute the label from the value. Explicit `label` wins. */
  showValue?: ProgressValueType;
  style?: ViewStyle;
  fillStyle?: ViewStyle;
  bufferStyle?: ViewStyle;
}

export interface ProgressBarProps extends ProgressProps {
  orientation?: ProgressBarOrientation;
  direction?: ProgressDirection;
  /** When > 1, render as N discrete segments instead of a continuous fill. */
  steps?: number;
  /** Pixel gap between segments in stepped mode. */
  stepGap?: number;
}

export interface CircularProgressProps extends ProgressProps {
  /** Diameter in px. */
  size?: number;
  /**
   * Fill thickness as a fraction of the radius, in [0, 1]. `>= 1` renders
   * a pie sector, `< 1` a ring stroke. Rings are the default.
   */
  thickness?: number;
  /** Starting angle in radians. Default −π/2 (top of circle). */
  startAngle?: number;
  direction?: CircularProgressDirection;
}
