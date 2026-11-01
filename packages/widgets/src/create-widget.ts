/**
 * Descriptor assembly shared by every widget factory. The per-widget
 * modules own their defaults and pseudo-states; this helper owns the
 * boilerplate — type, props, handlers, key, children — once.
 */
import type { ViewStyle, WidgetDescriptor, WidgetProps } from "@tsgui/layout";
import type {
  InteractionProps,
  Key,
  PointerPayload,
  ReconcilableWidget,
} from "@tsgui/core";

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

/**
 * Click handler shared by the checked controls (Checkbox, Toggle).
 *
 * Controlled (`checked` set): the consumer's onClick fires first, then
 * onCheckedChange carries the flip — the app re-renders with the new
 * value. Uncontrolled (`defaultChecked` instead): the flip persists in
 * the payload's state store under the stableId; the paint pass reads it
 * from there. Disabled controls no-op.
 */
export function createCheckedClickHandler(options: {
  disabled?: boolean;
  /** Controlled checked state — wins over defaultChecked. */
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?(checked: boolean, payload: PointerPayload): void;
  onClick?(payload: PointerPayload): void;
}): (payload: PointerPayload) => void {
  return (payload) => {
    options.onClick?.(payload);
    if (options.disabled) return;

    if (options.checked !== undefined) {
      options.onCheckedChange?.(!options.checked, payload);
      return;
    }

    const store = payload.stateStore;

    if (!store) return;

    const current = store.stateFor<boolean>({
      stableId: payload.stableId,
      initial: options.defaultChecked ?? false,
    });

    const next = !current;

    store.setState({ stableId: payload.stableId, value: next });
    options.onCheckedChange?.(next, payload);
  };
}
