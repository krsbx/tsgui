/**
 * RangeSlider — dual-handle range selection, controlled-only like
 * SliderBar. flying-pan's RangeSliderBar behavior: a handle-rect press
 * grabs that handle (coincident handles grab low), a track press grabs
 * the nearest handle and jumps it, drags clamp so handles can meet but
 * never cross.
 */
import type { ReconcilableWidget } from "@vulcania/core";
import {
  disabledStyle,
  focusableWhen,
  focusStyle,
  Metrics,
  Palette,
} from "@vulcania/core";
import {
  PointerEvents,
  ProgressBarOrientation,
  WidgetType,
} from "@vulcania/layout";
import { createWidget } from "../create-widget.ts";
import { createRangeDragValueHandler } from "./slider/drag.ts";
import { HANDLE_SIZE, TRACK_THICKNESS } from "./slider/geometry.ts";
import type { RangeSliderProps } from "./slider/types.ts";

export type { RangeSliderProps };

export function RangeSlider(props: RangeSliderProps): ReconcilableWidget {
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

  const drag = createRangeDragValueHandler({
    disabled: props.disabled,
    value: props.value,
    min,
    max,
    step: props.step,
    isVertical: !isHorizontal,
    onChange: props.onChange,
  });

  return createWidget({
    type: WidgetType.RangeSlider,
    props: {
      value: props.value,
      min,
      max,
      step: props.step,
      disabled: props.disabled,
      colorStops: props.colorStops,
      label: props.label,
      labelStyle: props.labelStyle,
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
