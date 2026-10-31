/** Widget descriptor factories — v1 set: View, Label, Image, Button. */
import type { TextStyle, ViewStyle } from "@tsgui/layout";
import type { ReconcilableWidget } from "./types.ts";

export function view(opts: {
  style?: ViewStyle;
  children?: ReconcilableWidget[];
  key?: string | number;
}): ReconcilableWidget {
  return { type: "View", props: {}, style: opts.style, children: opts.children, key: opts.key };
}

export function label(opts: {
  text: string;
  style?: TextStyle;
  key?: string | number;
}): ReconcilableWidget {
  return { type: "Label", props: { text: opts.text }, style: opts.style, key: opts.key };
}

export function image(opts: {
  src: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
  key?: string | number;
}): ReconcilableWidget {
  return {
    type: "Image",
    props: { src: opts.src, width: opts.width, height: opts.height },
    style: opts.style,
    key: opts.key,
  };
}

export function button(opts: {
  text: string;
  style?: ViewStyle;
  onPress?: () => void;
  key?: string | number;
}): ReconcilableWidget {
  return {
    type: "Button",
    props: { text: opts.text, onPress: opts.onPress },
    style: opts.style,
    key: opts.key,
  };
}
