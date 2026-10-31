/**
 * Progress widgets — linear and circular, ported from flying-pan's
 * widget/progress. Determinate when `value` is set; otherwise
 * `props.type` (default indeterminate, static until phase 4's
 * AnimationManager drives the motion).
 */
import {
  CircularProgressDirection,
  PointerEvents,
  ProgressDirection,
  ProgressType,
  ProgressBarOrientation,
  ProgressValueType,
  WidgetType,
  type TextStyle,
  type ViewStyle,
} from "@tsgui/layout";
import { Palette } from "../design.ts";
import { createWidget } from "../create-widget.ts";
import type { ColorStop } from "../paint/fill.ts";
import type { InteractionProps, Key, ReconcilableWidget } from "../types.ts";

export type { ColorStop };

export interface ProgressProps extends InteractionProps {
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
  key?: Key;
}

export interface ProgressBarProps extends ProgressProps {
  orientation?: ProgressBarOrientation;
  direction?: ProgressDirection;
  /** When > 1, render as N discrete segments instead of a continuous fill. */
  steps?: number;
  /** Pixel gap between segments in stepped mode. */
  stepGap?: number;
}

const DEFAULT_STEP_GAP = 2;
const DEFAULT_SIZE = 48;
const DEFAULT_THICKNESS = 0.1;
const DEFAULT_START_ANGLE = -Math.PI / 2;

/** The ProgressProps fields both factories carry into the descriptor. */
function sharedProgressProps(props: ProgressProps): ProgressProps {
  return {
    value: props.value,
    buffer: props.buffer,
    min: props.min,
    max: props.max,
    type: props.type,
    colorStops: props.colorStops,
    label: props.label,
    labelStyle: props.labelStyle,
    showValue: props.showValue,
    fillStyle: {
      backgroundColor: Palette.accent,
      ...props.fillStyle,
    },
    bufferStyle: props.bufferStyle,
  };
}

/** Determinate when `value` is set; otherwise the requested type. */
function resolveProgressType(props: ProgressProps): ProgressType {
  return props.value !== undefined
    ? ProgressType.Determinate
    : (props.type ?? ProgressType.Indeterminate);
}

export function ProgressBar(props: ProgressBarProps): ReconcilableWidget {
  const { style, key, ...handlers } = props;

  const orientation = props.orientation ?? ProgressBarOrientation.Horizontal;
  const direction = props.direction ?? ProgressDirection.Forward;
  const type = resolveProgressType(props);
  const isHorizontal = orientation === ProgressBarOrientation.Horizontal;

  return createWidget({
    type: WidgetType.ProgressBar,
    props: {
      ...sharedProgressProps(props),
      type,
      steps: props.steps,
      stepGap: props.stepGap ?? DEFAULT_STEP_GAP,
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

export function CircularProgress(props: CircularProgressProps): ReconcilableWidget {
  const { style, key, ...handlers } = props;

  const size = props.size ?? DEFAULT_SIZE;
  const startAngle = props.startAngle ?? DEFAULT_START_ANGLE;
  const direction = props.direction ?? CircularProgressDirection.Clockwise;
  const type = resolveProgressType(props);
  const thickness = props.thickness ?? DEFAULT_THICKNESS;

  return createWidget({
    type: WidgetType.CircularProgress,
    props: {
      ...sharedProgressProps(props),
      type,
      thickness,
      startAngle,
      direction,
      size,
    },
    style: {
      pointerEvents: PointerEvents.None,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: Palette.surfaceActive,
      ...style,
    },
    key,
    handlers,
  });
}
