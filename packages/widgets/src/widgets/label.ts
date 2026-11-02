/** Label — non-interactive text. */
import { Palette } from "@tsgui/core";
import type { BaseWidgetProps, ReconcilableWidget } from "@tsgui/core";
import { PointerEvents, WidgetType } from "@tsgui/layout";
import type { TextStyle } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";

export interface LabelProps extends BaseWidgetProps {
  text: string;
  /** Named font registered with the app's font manager. */
  font?: string;
  style?: TextStyle;
}

export function Label(props: LabelProps): ReconcilableWidget {
  const { text, font, style, key, ...handlers } = props;

  return createWidget({
    type: WidgetType.Label,
    // font must reach the props bag — the paint walk and the layout
    // resolver both read it to resolve the named font (factory rule:
    // props painters/resolvers read are forwarded here).
    props: { text, font },
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
