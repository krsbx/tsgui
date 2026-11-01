/**
 * Toggle — on/off switch, controlled checked state in batch 2 (same
 * contract as Checkbox; uncontrolled lands with the state milestone).
 */
import { type ViewStyle, WidgetType } from "@tsgui/layout";
import { createCheckedClickHandler, createWidget } from "../create-widget.ts";
import {
  disabledStyle,
  focusableWhen,
  focusStyle,
  Metrics,
  Palette,
} from "@tsgui/core";
import type {
  BaseWidgetProps,
  PointerPayload,
  ReconcilableWidget,
} from "@tsgui/core";

export interface ToggleProps extends BaseWidgetProps {
  /** Controlled checked state — wins over defaultChecked. */
  checked?: boolean;
  /** Uncontrolled initial state (store-backed). */
  defaultChecked?: boolean;
  onCheckedChange?(checked: boolean, payload: PointerPayload): void;
  disabled?: boolean;
  style?: ViewStyle;
  knobStyle?: ViewStyle;
}

export function Toggle(props: ToggleProps): ReconcilableWidget {
  const {
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    style,
    knobStyle,
    key,
    onClick,
    ...handlers
  } = props;

  return createWidget({
    type: WidgetType.Toggle,
    props: {
      checked,
      disabled,
      knobStyle: {
        backgroundColor: Palette.surface,
        ...knobStyle,
        _disabled: disabledStyle(knobStyle),
      },
    },
    style: {
      width: 48,
      height: 24,
      borderRadius: 24,
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      backgroundColor: Palette.surfaceActive,
      focusable: focusableWhen(disabled),
      ...style,
      _checked: {
        backgroundColor: Palette.accent,
        borderColor: Palette.accent,
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
