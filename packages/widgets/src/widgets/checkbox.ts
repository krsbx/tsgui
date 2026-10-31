/**
 * Checkbox — controlled checked state in batch 2: `checked` +
 * `onCheckedChange`; the uncontrolled StateStore variant (defaultChecked)
 * lands with the state foundation milestone.
 */
import { WidgetType, type ViewStyle } from "@tsgui/layout";
import { Metrics, Palette } from "../design.ts";
import { createCheckedClickHandler, createWidget } from "../create-widget.ts";
import type {
  InteractionProps,
  Key,
  PointerPayload,
  ReconcilableWidget,
} from "../types.ts";

export interface CheckboxProps extends InteractionProps {
  /** Controlled checked state. */
  checked?: boolean;
  onCheckedChange?(checked: boolean, payload: PointerPayload): void;
  disabled?: boolean;
  style?: ViewStyle;
  tickStyle?: ViewStyle;
  /** Tick size as a fraction of the box, in [0, 1]. */
  tickSize?: number;
  key?: Key;
}

export function Checkbox(props: CheckboxProps): ReconcilableWidget {
  const {
    checked,
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
      disabled,
      tickSize,
      tickStyle: {
        backgroundColor: Palette.textOnAccent,
        ...tickStyle,
        _disabled: {
          opacity: 0.5,
          ...tickStyle?._disabled,
        },
      },
    },
    style: {
      width: Metrics.controlSize,
      height: Metrics.controlSize,
      borderRadius: Metrics.controlRadius,
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      backgroundColor: Palette.surface,
      focusable: !disabled,
      ...style,
      _checked: {
        borderColor: Palette.accent,
        backgroundColor: Palette.accent,
        ...style?._checked,
      },
      _focus: {
        borderColor: Palette.borderFocus,
        ...style?._focus,
      },
      _disabled: {
        opacity: 0.5,
        ...style?._disabled,
      },
    },
    key,
    handlers: {
      ...handlers,
      onClick: createCheckedClickHandler({
        disabled,
        checked,
        onCheckedChange,
        onClick,
      }),
    },
  });
}
