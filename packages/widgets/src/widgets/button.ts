/**
 * Button — chrome box with baked defaults and pseudo-states. The label is
 * a child (usually a Label widget), matching flying-pan's composition.
 */
import { WidgetType } from "@tsgui/layout";
import type { ViewStyle } from "@tsgui/layout";
import { Metrics, Palette } from "../design.ts";
import type { InteractionProps, ReconcilableWidget } from "../types.ts";

export interface ButtonProps extends InteractionProps {
  style?: ViewStyle;
  children?: ReconcilableWidget[];
  disabled?: boolean;
  key?: string | number;
}

export function Button(props: ButtonProps): ReconcilableWidget {
  const {
    style,
    children,
    disabled,
    key,
    ...handlers
  } = props;

  return {
    type: WidgetType.Button,
    props: { disabled },
    style: {
      width: Metrics.buttonWidth,
      height: Metrics.buttonHeight,
      padding: Metrics.defaultPadding,
      borderRadius: Metrics.buttonRadius,
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      backgroundColor: Palette.surface,
      focusable: !disabled,
      ...style,
      // Baked pseudo-states; user overrides win via spread order.
      _hover: {
        backgroundColor: Palette.surfaceHover,
        ...style?._hover,
      },
      _focus: {
        borderColor: Palette.borderFocus,
        backgroundColor: Palette.surfaceHover,
        ...style?._focus,
      },
      _active: {
        backgroundColor: Palette.surfaceActive,
        ...style?._active,
      },
      _disabled: {
        opacity: 0.5,
        ...style?._disabled,
      },
    },
    children,
    key,
    ...handlers,
  };
}
