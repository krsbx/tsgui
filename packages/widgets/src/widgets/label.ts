/** Label — non-interactive text. */
import { Palette } from "@tsgui/core";
import type { BaseWidgetProps, ReconcilableWidget } from "@tsgui/core";
import { PointerEvents, WidgetType } from "@tsgui/layout";
import type { TextStyle } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";

export interface LabelProps extends BaseWidgetProps {
  text: string;
  style?: TextStyle;
}

export function Label(props: LabelProps): ReconcilableWidget {
  const { text, style, key, ...handlers } = props;

  return createWidget({
    type: WidgetType.Label,
    props: { text },
    style: {
      // Labels never intercept the pointer — hit-tests fall through.
      pointerEvents: PointerEvents.None,
      color: Palette.text,
      ...style,
    },
    key,
    handlers,
  });
}
