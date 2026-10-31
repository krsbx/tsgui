/** @tsgui/widgets — reconciler, state, design tokens, widget modules, paint bridge. */
export { StateStore } from "./state.ts";
export { Reconciler } from "./reconciler.ts";
export { Palette, Metrics, MeterZone, type PaletteColor, type MetricKey } from "./design.ts";
export { createWidget, type CreateWidgetOptions } from "./create-widget.ts";
export * from "./types.ts";

// Per-widget modules — factories + props
export { View, type ViewProps } from "./widgets/view.ts";
export { Label, type LabelProps } from "./widgets/label.ts";
export { Button, type ButtonProps } from "./widgets/button.ts";
export { Image, type ImageProps } from "./widgets/image.ts";
export {
  CircularProgress,
  ProgressBar,
  type CircularProgressProps,
  type ProgressBarProps,
  type ProgressProps,
} from "./widgets/progress.ts";
export { Meter, type MeterProps } from "./widgets/meter.ts";

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

// Headless harness — tree → reconcile → layout → recorded ops
export {
  renderHeadless,
  serializeLayoutTree,
  PaintOpKind,
  type HeadlessOptions,
  type HeadlessFrame,
  type PaintOp,
  type SerializedLayoutNode,
} from "./harness.ts";

// Paint modules — per-widget painters + shared fill/label helpers
export {
  fillShape,
  paintBorder,
  paintBackground,
  paintContinuousFill,
  paintSteppedFill,
  resolveFillColor,
  resolveFillColorClamped,
  type ColorStop,
  type ContinuousFillOptions,
  type SteppedFillOptions,
} from "./paint/fill.ts";
export { formatValueLabel, paintInlineValueLabel } from "./paint/label.ts";
export {
  paintProgressBar,
  paintCircularProgress,
} from "./paint/progress.ts";
export { paintMeter, resolveMeterColor } from "./paint/meter.ts";
