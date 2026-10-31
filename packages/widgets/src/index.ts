/** @tsgui/widgets — reconciler, state, design tokens, widget modules, paint bridge. */
export { createWidget, type CreateWidgetOptions } from "./create-widget.ts";
export {
  MeterZone,
  type MetricKey,
  Metrics,
  Palette,
  type PaletteColor,
} from "./design.ts";
export { Reconciler } from "./reconciler.ts";
export { StateStore } from "./state.ts";
export * from "./types.ts";

// Per-widget modules — factories + props
export { Button, type ButtonProps } from "./widgets/button.ts";
export { Checkbox, type CheckboxProps } from "./widgets/checkbox.ts";
export { Image, type ImageProps } from "./widgets/image.ts";
export { Label, type LabelProps } from "./widgets/label.ts";
export { Meter, type MeterProps } from "./widgets/meter.ts";
export {
  CircularProgress,
  type CircularProgressProps,
  ProgressBar,
  type ProgressBarProps,
  type ProgressProps,
} from "./widgets/progress.ts";
export { RadioGroup, type RadioGroupProps } from "./widgets/radio-group.ts";
export { Radio, type RadioProps } from "./widgets/radio.ts";
export { Toggle, type ToggleProps } from "./widgets/toggle.ts";
export { View, type ViewProps } from "./widgets/view.ts";

// Interaction dispatch — pointer events, hit-testing
export { hitTest, type HitTestOptions } from "./interactions/hit-test.ts";
export {
  PointerDispatcher,
  type PointerDispatchOptions,
} from "./interactions/pointer.ts";
export {
  type PointerInputEvent,
  PointerInputKind,
} from "./interactions/types.ts";

// Paint bridge
export {
  colorWithOpacity,
  type InteractionStates,
  type PaintContext,
  type Painter,
  paintTree,
  parseColor,
  resolveStyle,
  type TextPainter,
} from "./paint.ts";

// Headless harness — tree → reconcile → layout → recorded ops
export {
  type HeadlessFrame,
  type HeadlessOptions,
  type PaintOp,
  PaintOpKind,
  renderHeadless,
  type SerializedLayoutNode,
  serializeLayoutTree,
} from "./harness.ts";

// Paint modules — per-widget painters + shared fill/label helpers
export {
  type ColorStop,
  type ContinuousFillOptions,
  fillShape,
  paintBackground,
  paintBorder,
  paintContinuousFill,
  paintSteppedFill,
  resolveFillColor,
  resolveFillColorClamped,
  type SteppedFillOptions,
} from "./paint/fill.ts";
export { formatValueLabel, paintInlineValueLabel } from "./paint/label.ts";
export { paintMeter, resolveMeterColor } from "./paint/meter.ts";
export { paintCircularProgress, paintProgressBar } from "./paint/progress.ts";
