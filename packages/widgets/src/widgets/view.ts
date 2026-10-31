/** View — the base container widget. */
import { WidgetType } from "@tsgui/layout";
import type { ViewStyle } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";
import type { InteractionProps, Key, ReconcilableWidget } from "../types.ts";

export interface ViewProps extends InteractionProps {
  style?: ViewStyle;
  children?: ReconcilableWidget[];
  key?: Key;
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
