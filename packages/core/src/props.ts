/**
 * The typed props-bag view — the codebase's single cast site for
 * descriptor props. Runtime helper, kept out of the types-only
 * contract modules.
 */
import type { WidgetDescriptor } from "@tsgui/layout";

export function propsOf<T extends object>(widget: WidgetDescriptor): T {
  return widget.props as T;
}
