/**
 * SliderBar — controlled drag slider. Pointer behavior ported from
 * flying-pan's widget/slider: press on the track jumps, press on the
 * handle drags from the current value, moves apply while captured.
 * Uncontrolled StateStore mode is deferred to the state milestone.
 */
import {
  PointerEvents,
  ProgressBarOrientation,
  valueToRatio,
  WidgetType,
} from "@tsgui/layout";
import { Metrics, Palette, disabledStyle, focusStyle, focusableWhen } from "../design.ts";
import { createWidget } from "../create-widget.ts";
import {
  HANDLE_SIZE,
  TRACK_THICKNESS,
  isOnBarHandle,
  pointerToValue,
  sliderValue,
} from "./slider/geometry.ts";
import type { SliderBarProps } from "./slider/types.ts";
import type { ReconcilableWidget } from "../types.ts";

export type { SliderBarProps };

export function SliderBar(props: SliderBarProps): ReconcilableWidget {
  const {
    style,
    trackStyle,
    filledStyle,
    handleStyle,
    key,
    onClick,
    onPointerDown,
    onPointerMove,
    ...handlers
  } = props;

  const isHorizontal = props.orientation !== ProgressBarOrientation.Vertical;
  const min = props.min ?? 0;
  const max = props.max ?? 100;

  /**
   * Per-descriptor last notified value — event-fed moves recompute the
   * same position several times before the app re-renders, and the stale
   * `props.value` comparison alone can't dedupe those.
   */
  let lastApplied: number | null = null;

  /** Track press → jump; handle press → drag from current (no jump). */
  const applyPointerValue = (
    x: number,
    y: number,
    node: { screenX: number; screenY: number; width: number; height: number }
  ): void => {
    if (props.disabled) return;

    const next = pointerToValue({
      coord: isHorizontal ? x : y,
      start: isHorizontal ? node.screenX : node.screenY,
      length: isHorizontal ? node.width : node.height,
      flip: !isHorizontal,
      min,
      max,
      step: props.step,
    });

    if (next === (lastApplied ?? props.value)) return;
    lastApplied = next;
    props.onChange?.(next);
  };

  return createWidget({
    type: WidgetType.SliderBar,
    props: {
      value: props.value,
      min,
      max,
      step: props.step,
      disabled: props.disabled,
      colorStops: props.colorStops,
      label: props.label,
      labelStyle: props.labelStyle,
      showValue: props.showValue,
      marks: props.marks,
      orientation: props.orientation ?? ProgressBarOrientation.Horizontal,
      trackStyle: {
        backgroundColor: Palette.surfaceActive,
        borderRadius: TRACK_THICKNESS / 2,
        ...trackStyle,
        _disabled: disabledStyle(trackStyle),
      },
      filledStyle: {
        backgroundColor: Palette.accent,
        borderRadius: TRACK_THICKNESS / 2,
        ...filledStyle,
        _disabled: disabledStyle(filledStyle),
      },
      handleStyle: {
        backgroundColor: Palette.surface,
        borderWidth: Metrics.borderWidth,
        borderColor: Palette.border,
        borderRadius: HANDLE_SIZE / 2,
        ...handleStyle,
        _disabled: disabledStyle(handleStyle),
      },
    },
    style: {
      width: isHorizontal ? 200 : 24,
      height: isHorizontal ? 24 : 200,
      // The control paints its own track — the box itself is hit space.
      backgroundColor: "transparent",
      focusable: focusableWhen(props.disabled),
      pointerEvents: PointerEvents.Auto,
      ...style,
      _focus: focusStyle(style),
      _disabled: disabledStyle(style),
    },
    key,
    handlers: {
      ...handlers,
      onClick: (payload) => {
        onClick?.(payload);
        if (props.disabled) return;
        // Track click (not on the handle) jumps straight to the value.
        const ratio = valueToRatio({ value: sliderValue(props), min, max });
        const onHandle = isOnBarHandle({
          x: payload.x,
          y: payload.y,
          node: payload.node,
          ratio,
          isVertical: !isHorizontal,
        });
        if (!onHandle) applyPointerValue(payload.x, payload.y, payload.node);
      },
      onPointerDown: (payload) => {
        onPointerDown?.(payload);
        if (props.disabled) return;
        const ratio = valueToRatio({ value: sliderValue(props), min, max });
        const onHandle = isOnBarHandle({
          x: payload.x,
          y: payload.y,
          node: payload.node,
          ratio,
          isVertical: !isHorizontal,
        });
        if (!onHandle) applyPointerValue(payload.x, payload.y, payload.node);
        payload.capturePointer?.();
      },
      onPointerMove: (payload) => {
        onPointerMove?.(payload);
        // Drag applies only while captured — hover moves don't mutate.
        if (!payload.captured) return;
        applyPointerValue(payload.x, payload.y, payload.node);
      },
    },
  });
}
