/** Image — texture-backed widget. */
import type { BaseWidgetProps, ReconcilableWidget } from "@vulcania/core";
import { WidgetType } from "@vulcania/layout";
import type { ViewStyle } from "@vulcania/layout";
import { createWidget } from "../create-widget.ts";

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
