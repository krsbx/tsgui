/**
 * Checkbox — controlled checked state in batch 2: `checked` +
 * `onCheckedChange`; the uncontrolled StateStore variant (defaultChecked)
 * lands with the state foundation milestone.
 */
import { type ViewStyle, WidgetType } from "@tsgui/layout";
import { createCheckedClickHandler, createWidget } from "../create-widget.ts";
import {
  disabledStyle,
  focusableWhen,
  focusStyle,
  Metrics,
  Palette,
} from "../design.ts";
import type {
  BaseWidgetProps,
  PointerPayload,
  ReconcilableWidget,
} from "../types.ts";

export interface CheckboxProps extends BaseWidgetProps {
  /** Controlled checked state — wins over defaultChecked. */
  checked?: boolean;
  /** Uncontrolled initial state (store-backed; needs a focused paint ctx store). */
  defaultChecked?: boolean;
  onCheckedChange?(checked: boolean, payload: PointerPayload): void;
  disabled?: boolean;
  style?: ViewStyle;
  tickStyle?: ViewStyle;
  /** Tick size as a fraction of the box, in [0, 1]. */
  tickSize?: number;
}

export function Checkbox(props: CheckboxProps): ReconcilableWidget {
  const {
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    style,
    tickStyle,
    tickSize,
    key,
    onClick,
    ...handlers
  } = props;

  return createWidget({
    type: WidgetType.Checkbox,
    props: {
      checked,
      defaultChecked,
      disabled,
      tickSize,
      tickStyle: {
        backgroundColor: Palette.textOnAccent,
        ...tickStyle,
        _disabled: disabledStyle(tickStyle),
      },
    },
    style: {
      width: Metrics.controlSize,
      height: Metrics.controlSize,
      borderRadius: Metrics.controlRadius,
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      backgroundColor: Palette.surface,
      focusable: focusableWhen(disabled),
      ...style,
      _checked: {
        borderColor: Palette.accent,
        backgroundColor: Palette.accent,
        ...style?._checked,
      },
      _focus: focusStyle(style),
      _disabled: disabledStyle(style),
    },
    key,
    handlers: {
      ...handlers,
      onClick: createCheckedClickHandler({
        disabled,
        checked,
        defaultChecked,
        onCheckedChange,
        onClick,
      }),
    },
  });
}
