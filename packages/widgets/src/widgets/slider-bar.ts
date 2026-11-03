/**
 * SliderBar — controlled drag slider. Pointer behavior ported from
 * flying-pan's widget/slider: press on the track jumps, press on the
 * handle drags from the current value, moves apply while captured.
 * Uncontrolled StateStore mode is deferred to the state milestone.
 */
import {
  disabledStyle,
  focusableWhen,
  focusStyle,
  Metrics,
  Palette,
} from "@vulcania/core";
import type { ReconcilableWidget } from "@vulcania/core";
import {
  PointerEvents,
  ProgressBarOrientation,
  valueToRatio,
  WidgetType,
} from "@vulcania/layout";
import { createWidget } from "../create-widget.ts";
import { createDragValueHandler } from "./slider/drag.ts";
import {
  HANDLE_SIZE,
  isOnBarHandle,
  pointerToValue,
  sliderValue,
  TRACK_THICKNESS,
} from "./slider/geometry.ts";
import type { SliderBarProps } from "./slider/types.ts";

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

  const drag = createDragValueHandler({
    disabled: props.disabled,
    value: props.value,
    onChange: props.onChange,
    positionToValue: (x, y, node) =>
      pointerToValue({
        coord: isHorizontal ? x : y,
        start: isHorizontal ? node.screenX : node.screenY,
        length: isHorizontal ? node.width : node.height,
        flip: !isHorizontal,
        min,
        max,
        step: props.step,
      }),
    onHandle: (x, y, node) =>
      isOnBarHandle({
        x,
        y,
        node,
        ratio: valueToRatio({ value: sliderValue(props), min, max }),
        isVertical: !isHorizontal,
      }),
  });

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
        drag.onClick(payload);
      },
      onPointerDown: (payload) => {
        onPointerDown?.(payload);
        drag.onPointerDown(payload);
      },
      onPointerMove: (payload) => {
        onPointerMove?.(payload);
        drag.onPointerMove(payload);
      },
    },
  });
}
