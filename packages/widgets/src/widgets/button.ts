/**
 * Button — chrome box with baked defaults and pseudo-states. The label is
 * a child (usually a Label widget), matching flying-pan's composition.
 */
import {
  disabledStyle,
  focusableWhen,
  focusStyle,
  Metrics,
  Palette,
} from "@tsgui/core";
import type { BaseWidgetProps, ReconcilableWidget } from "@tsgui/core";
import { WidgetType } from "@tsgui/layout";
import type { ViewStyle } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";

export interface ButtonProps extends BaseWidgetProps {
  style?: ViewStyle;
  children?: ReconcilableWidget[];
  disabled?: boolean;
}

export function Button(props: ButtonProps): ReconcilableWidget {
  const { style, children, disabled, key, ...handlers } = props;

  return createWidget({
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
      focusable: focusableWhen(disabled),
      ...style,
      // Baked pseudo-states; user overrides win via spread order.
      _hover: {
        backgroundColor: Palette.surfaceHover,
        ...style?._hover,
      },
      _focus: focusStyle(style, { backgroundColor: Palette.surfaceHover }),
      _active: {
        backgroundColor: Palette.surfaceActive,
        ...style?._active,
      },
      _disabled: disabledStyle(style),
    },
    children,
    key,
    handlers,
  });
}
