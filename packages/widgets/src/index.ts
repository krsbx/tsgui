/**
 * @vulcania/widgets — the widget library: factories, the reconciler, each
 * widget's painter, and the headless harness. Contracts come from
 * @vulcania/core; input dispatchers live in @vulcania/interactions; the
 * generic rendering engine lives in @vulcania/paint (widgets contribute
 * their painters through PaintContext.painters).
 */
export * from "@vulcania/core";
export { createWidget, type CreateWidgetOptions } from "./create-widget.ts";
export { Reconciler } from "./reconciler.ts";

// Per-widget modules — factories + props
export { Button, type ButtonProps } from "./widgets/button.ts";
export { Checkbox, type CheckboxProps } from "./widgets/checkbox.ts";
export { CircularSlider } from "./widgets/circular-slider.ts";
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
export { Radio, type RadioProps } from "./widgets/radio.ts";
export { SliderBar, type SliderBarProps } from "./widgets/slider-bar.ts";
export {
  type CircularGeometry,
  isOnBarHandle,
  isOnCircularHandle,
  pointerToAngleValue,
  pointerToValue,
  resolveGeometry,
  sliderValue,
} from "./widgets/slider/geometry.ts";
export { type SliderMark } from "./widgets/slider/types.ts";
export type {
  CircularSliderProps,
  SliderProps,
} from "./widgets/slider/types.ts";
export {
  resetTextAreaEditingStates,
  TextArea,
  editingStateOf as textAreaEditingStateOf,
  type TextAreaProps,
  type TextAreaStyle,
} from "./widgets/text-area/index.ts";
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
export { Toggle, type ToggleProps } from "./widgets/toggle.ts";
export { View, type ViewProps } from "./widgets/view.ts";

// The per-widget painter registry + widget-side painter helpers
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
