/**
 * CircularSlider — drag on a ring (or arc). Ported from flying-pan's
 * widget/slider/circular: press on the track jumps to the angle's value,
 * press on the handle dot drags, captured moves apply. Controlled-only
 * (uncontrolled lands with the state milestone).
 */
import { clamp, type LayoutNode } from "@tsgui/layout";
import { PointerEvents, WidgetType } from "@tsgui/layout";
import { Metrics, Palette, disabledStyle, focusStyle, focusableWhen } from "../design.ts";
import { createWidget } from "../create-widget.ts";
import {
  DEFAULT_CIRCULAR_SIZE,
  DEFAULT_CIRCULAR_THICKNESS,
  HANDLE_SIZE,
  isOnCircularHandle,
  pointerToAngleValue,
  resolveGeometry,
  sliderValue,
} from "./slider/geometry.ts";
import type { CircularSliderProps } from "./slider/types.ts";
import type { PointerPayload, ReconcilableWidget } from "../types.ts";

export type { CircularSliderProps };

export function CircularSlider(props: CircularSliderProps): ReconcilableWidget {
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

  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const size = props.size ?? DEFAULT_CIRCULAR_SIZE;
  const thickness = props.thickness ?? DEFAULT_CIRCULAR_THICKNESS;

  /** Per-descriptor dedupe — see SliderBar's lastApplied note. */
  let lastApplied: number | null = null;

  const applyPointerValue = (x: number, y: number, node: LayoutNode): void => {
    if (props.disabled) return;

    const geo = resolveGeometry(props, node);
    const next = clamp({
      value: pointerToAngleValue({ ...geo, pointerX: x, pointerY: y, step: props.step }),
      min,
      max,
    });

    if (next === (lastApplied ?? props.value)) return;
    lastApplied = next;
    props.onChange?.(next);
  };

  const onHandle = (payload: PointerPayload): boolean =>
    isOnCircularHandle({
      x: payload.x,
      y: payload.y,
      geo: resolveGeometry(props, payload.node),
      value: sliderValue(props),
      size,
      thickness,
    });

  return createWidget({
    type: WidgetType.CircularSlider,
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
      size,
      thickness,
      startAngle: props.startAngle,
      sweep: props.sweep,
      direction: props.direction,
      trackStyle: {
        backgroundColor: Palette.surfaceActive,
        ...trackStyle,
        _disabled: disabledStyle(trackStyle),
      },
      filledStyle: {
        backgroundColor: Palette.accent,
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
      width: size,
      height: size,
      // The control paints its own ring — the box is hit space only.
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
        if (!onHandle(payload)) applyPointerValue(payload.x, payload.y, payload.node);
      },
      onPointerDown: (payload) => {
        onPointerDown?.(payload);
        if (props.disabled) return;
        if (!onHandle(payload)) applyPointerValue(payload.x, payload.y, payload.node);
        payload.capturePointer?.();
      },
      onPointerMove: (payload) => {
        onPointerMove?.(payload);
        if (!payload.captured) return;
        applyPointerValue(payload.x, payload.y, payload.node);
      },
    },
  });
}
