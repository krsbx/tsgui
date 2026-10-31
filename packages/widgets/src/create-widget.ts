/**
 * Descriptor assembly shared by every widget factory. The per-widget
 * modules own their defaults and pseudo-states; this helper owns the
 * boilerplate — type, props, handlers, key, children — once.
 */
import type {
  ViewStyle,
  WidgetDescriptor,
  WidgetProps,
} from "@tsgui/layout";
import type {
  InteractionProps,
  Key,
  ReconcilableWidget,
} from "./types.ts";

export interface CreateWidgetOptions {
  type: WidgetDescriptor["type"];
  props: WidgetProps;
  style?: ViewStyle;
  children?: ReconcilableWidget[];
  key?: Key;
  /** Interaction handlers spread verbatim onto the descriptor. */
  handlers: InteractionProps;
}

export function createWidget(options: CreateWidgetOptions): ReconcilableWidget {
  const { type, props, style, children, key, handlers } = options;

  return {
    type,
    props,
    style,
    children,
    key,
    ...handlers,
  };
}
