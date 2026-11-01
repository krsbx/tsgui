/** View — the base container widget. */
import type { BaseWidgetProps, ReconcilableWidget } from "@tsgui/core";
import { WidgetType } from "@tsgui/layout";
import type { ViewStyle } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";

export interface ViewProps extends BaseWidgetProps {
  style?: ViewStyle;
  children?: ReconcilableWidget[];
}

export function View(props: ViewProps): ReconcilableWidget {
  const { style, children, key, ...handlers } = props;

  return createWidget({
    type: WidgetType.View,
    props: {},
    style,
    children,
    key,
    handlers,
  });
}
