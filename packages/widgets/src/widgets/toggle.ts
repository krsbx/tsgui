/**
 * Toggle — on/off switch, controlled checked state in batch 2 (same
 * contract as Checkbox; uncontrolled lands with the state milestone).
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

export interface ToggleProps extends InteractionProps {
  /** Controlled checked state. */
  checked?: boolean;
  onCheckedChange?(checked: boolean, payload: PointerPayload): void;
  disabled?: boolean;
  style?: ViewStyle;
  knobStyle?: ViewStyle;
  key?: Key;
}

export function Toggle(props: ToggleProps): ReconcilableWidget {
  const {
    checked,
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
        _disabled: {
          opacity: 0.5,
          ...knobStyle?._disabled,
        },
      },
    },
    style: {
      width: 48,
      height: 24,
      borderRadius: 24,
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      backgroundColor: Palette.surfaceActive,
      focusable: !disabled,
      ...style,
      _checked: {
        backgroundColor: Palette.accent,
        borderColor: Palette.accent,
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
