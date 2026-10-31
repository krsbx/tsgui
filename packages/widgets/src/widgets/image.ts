/** Image — texture-backed widget. */
import { WidgetType } from "@tsgui/layout";
import type { ViewStyle } from "@tsgui/layout";
import type { InteractionProps, ReconcilableWidget } from "../types.ts";

export interface ImageProps extends InteractionProps {
  src: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
  key?: string | number;
}

export function Image(props: ImageProps): ReconcilableWidget {
  const { src, width, height, style, key, ...handlers } = props;

  return {
    type: WidgetType.Image,
    props: { src, width, height },
    style,
    key,
    ...handlers,
  };
}
