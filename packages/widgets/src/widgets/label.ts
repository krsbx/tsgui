/** Label — non-interactive text. */
import { PointerEvents, WidgetType } from "@tsgui/layout";
import type { TextStyle } from "@tsgui/layout";
import { Palette } from "../design.ts";
import { createWidget } from "../create-widget.ts";
import type { InteractionProps, Key, ReconcilableWidget } from "../types.ts";

export interface LabelProps extends InteractionProps {
  text: string;
  style?: TextStyle;
  key?: Key;
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
