/** Radio — the dot control; selection logic lives in RadioGroup. */
import { type TextStyle, type ViewStyle, WidgetType } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";
import {
  disabledStyle,
  focusableWhen,
  focusStyle,
  Metrics,
  Palette,
} from "@tsgui/core";
import type { BaseWidgetProps, ReconcilableWidget } from "@tsgui/core";

export interface RadioProps extends BaseWidgetProps {
  /** Group-unique value this radio represents. */
  value: string;
  /** Controlled selection — set by a RadioGroup; standalone is cosmetic. */
  selected?: boolean;
  /** Uncontrolled group name — set by a RadioGroup (derived if absent). */
  name?: string;
  /** Uncontrolled initial selection — the group's defaultValue. */
  groupDefaultValue?: string;
  /** Rendered next to the dot when the Radio is used in a RadioGroup. */
  label?: string;
  labelStyle?: TextStyle;
  disabled?: boolean;
  style?: ViewStyle;
  dotStyle?: ViewStyle;
  /** Dot size as a fraction of the control, in [0, 1]. */
  dotSize?: number;
}

export function Radio(props: RadioProps): ReconcilableWidget {
  const { style, dotStyle, key, ...handlers } = props;

  return createWidget({
    type: WidgetType.Radio,
    props: {
      value: props.value,
      selected: props.selected,
      name: props.name,
      groupDefaultValue: props.groupDefaultValue,
      label: props.label,
      labelStyle: props.labelStyle,
      disabled: props.disabled,
      dotSize: props.dotSize,
      dotStyle: {
        backgroundColor: Palette.accent,
        ...dotStyle,
        _disabled: disabledStyle(dotStyle),
      },
    },
    style: {
      width: Metrics.controlSize,
      height: Metrics.controlSize,
      borderRadius: Metrics.controlSize / 2,
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      backgroundColor: Palette.surface,
      focusable: focusableWhen(props.disabled),
      ...style,
      _checked: {
        borderColor: Palette.accent,
        ...style?._checked,
      },
      _focus: focusStyle(style),
      _disabled: disabledStyle(style),
    },
    key,
    handlers,
  });
}
