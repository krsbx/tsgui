/** View — the base container widget. */
import type { BaseWidgetProps, ReconcilableWidget } from "@vulcania/core";
import { WidgetType } from "@vulcania/layout";
import type { ViewStyle } from "@vulcania/layout";
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
