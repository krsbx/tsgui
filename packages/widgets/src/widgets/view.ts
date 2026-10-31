/** View — the base container widget. */
import { WidgetType } from "@tsgui/layout";
import type { ViewStyle } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";
import type { BaseWidgetProps, ReconcilableWidget } from "../types.ts";

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
