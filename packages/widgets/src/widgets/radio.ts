/** Radio — the dot control; selection logic lives in RadioGroup. */
import { WidgetType, type TextStyle, type ViewStyle } from "@tsgui/layout";
import { Metrics, Palette, disabledStyle, focusStyle, focusableWhen } from "../design.ts";
import { createWidget } from "../create-widget.ts";
import type { BaseWidgetProps, ReconcilableWidget } from "../types.ts";

export interface RadioProps extends BaseWidgetProps {
  /** Group-unique value this radio represents. */
  value: string;
  /** Controlled selection — set by a RadioGroup; standalone is cosmetic. */
  selected?: boolean;
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
