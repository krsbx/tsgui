/** @tsgui/widgets — reconciler, state, design tokens, widget modules, paint bridge. */
export { createWidget, type CreateWidgetOptions } from "./create-widget.ts";
export {
  MeterZone,
  type MetricKey,
  Metrics,
  Palette,
  type ColorStop,
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
} from "./widgets/progress/index.ts";
export { RadioGroup, type RadioGroupProps } from "./widgets/radio-group.ts";
export { SliderBar, type SliderBarProps } from "./widgets/slider-bar.ts";
export { CircularSlider } from "./widgets/circular-slider.ts";
export { TextInput, type TextInputProps, type TextInputStyle } from "./widgets/text-input/index.ts";
export {
  editingStateOf,
  textInputClipboard,
  type TextInputState,
} from "./widgets/text-input/state.ts";
export {
  isOnBarHandle,
  isOnCircularHandle,
  pointerToAngleValue,
  pointerToValue,
  resolveGeometry,
  sliderValue,
  type CircularGeometry,
} from "./widgets/slider/geometry.ts";
export { type SliderMark } from "./widgets/slider/types.ts";
export type {
  CircularSliderProps,
  SliderProps,
} from "./widgets/slider/types.ts";
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
  type KeyboardInputEvent,
  KeyboardInputKind,
  type PointerInputEvent,
  PointerInputKind,
} from "./interactions/types.ts";
export { FocusDispatcher, type FocusDispatchOptions } from "./interactions/focus.ts";

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
  type ContinuousFillOptions,
  fillRatio,
  paintContinuousFill,
  paintSteppedFill,
} from "./paint/fill.ts";
export {
  fillShape,
  paintBackground,
  paintBorder,
} from "./paint/shape.ts";
export {
  resolveFillColor,
  resolveFillColorClamped,
} from "./paint/color-stops.ts";
export { formatValueLabel, paintInlineValueLabel } from "./paint/label.ts";
export { paintMeter, resolveMeterColor } from "./paint/meter.ts";
export {
  paintCircularProgress,
  paintProgressBar,
} from "./paint/progress/index.ts";
