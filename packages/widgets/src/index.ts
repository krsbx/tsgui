/** @tsgui/widgets — reconciler, state, design tokens, widget modules, paint bridge. */
export { StateStore } from "./state.ts";
export { Reconciler } from "./reconciler.ts";
export { Palette, Metrics, type PaletteColor, type MetricKey } from "./design.ts";
export { createWidget, type CreateWidgetOptions } from "./create-widget.ts";
export * from "./types.ts";

// Per-widget modules — factories + props
export { View, type ViewProps } from "./widgets/view.ts";
export { Label, type LabelProps } from "./widgets/label.ts";
export { Button, type ButtonProps } from "./widgets/button.ts";
export { Image, type ImageProps } from "./widgets/image.ts";

// Paint bridge
export {
  paintTree,
  parseColor,
  colorWithOpacity,
  resolveStyle,
  type PaintContext,
  type Painter,
  type TextPainter,
  type InteractionStates,
} from "./paint.ts";
