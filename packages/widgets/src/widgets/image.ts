/** Image — texture-backed widget. */
import { WidgetType } from "@tsgui/layout";
import type { ViewStyle } from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";
import type { BaseWidgetProps, ReconcilableWidget } from "../types.ts";

export interface ImageProps extends BaseWidgetProps {
  src: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function Image(props: ImageProps): ReconcilableWidget {
  const { src, width, height, style, key, ...handlers } = props;

  return createWidget({
    type: WidgetType.Image,
    props: { src, width, height },
    style,
    key,
    handlers,
  });
}
