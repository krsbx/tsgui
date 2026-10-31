/** View — the base container widget. */
import type { ViewStyle } from "@tsgui/layout";
import type { InteractionProps, ReconcilableWidget } from "../types.ts";
import { WidgetType } from "@tsgui/layout";

export interface ViewProps extends InteractionProps {
  style?: ViewStyle;
  children?: ReconcilableWidget[];
  key?: string | number;
}

export function View(props: ViewProps): ReconcilableWidget {
  const { style, children, key, ...handlers } = props;

  return {
    type: WidgetType.View,
    props: {},
    style,
    children,
    key,
    ...handlers,
  };
}
