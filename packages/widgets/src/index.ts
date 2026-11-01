/** @tsgui/widgets — reconciler, state, design tokens, widget modules, paint bridge. */
export { createWidget, type CreateWidgetOptions } from "./create-widget.ts";
export {
  MeterZone,
  type MetricKey,
  Metrics,
  Palette,
  type ColorStop,
  type PaletteColor,
} from "@tsgui/core";
export { Reconciler } from "./reconciler.ts";
export { StateStore } from "@tsgui/core";
export * from "@tsgui/core";

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
export {
  TextInput,
  type TextInputProps,
  type TextInputStyle,
} from "./widgets/text-input/index.ts";
export {
  editingStateOf,
  resetTextInputEditingStates,
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

// Interaction dispatch — pointer events, hit-testing (@tsgui/interactions)
export {
  FocusDispatcher,
  type FocusDispatchOptions,
  hitTest,
  type HitTestOptions,
  type KeyboardInputEvent,
  KeyboardInputKind,
  measureContent,
  PointerDispatcher,
  type PointerDispatchOptions,
  type PointerInputEvent,
  PointerInputKind,
  ScrollDispatcher,
  type ScrollDispatchOptions,
  type WheelInputEvent,
} from "@tsgui/interactions";

// Paint engine (generic) + the per-widget painter registry
export {
  type ContinuousFillOptions,
  colorWithOpacity,
  fillRatio,
  fillShape,
  type InteractionStates,
  paintContinuousFill,
  paintBackground,
  paintBorder,
  paintShadow,
  paintSteppedFill,
  type PaintContext,
  type Painter,
  paintTree,
  parseColor,
  resolveFillColor,
  resolveFillColorClamped,
  resolveStyle,
  type TextPainter,
  type WidgetPainter,
  type WidgetPainters,
} from "@tsgui/paint";
export { widgetPainters } from "./painters.ts";
export {
  formatValueLabel,
  paintInlineValueLabel,
} from "./widgets/label/paint.ts";
export { paintMeter, resolveMeterColor } from "./widgets/meter/paint.ts";
export {
  paintCircularProgress,
  paintProgressBar,
} from "./widgets/progress/paint/index.ts";

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
