/** Layout enums — ported from flying-pan's widget constants. */

export const FlexJustify = {
  Start: "flex-start",
  End: "flex-end",
  Center: "center",
  SpaceBetween: "space-between",
  SpaceAround: "space-around",
  SpaceEvenly: "space-evenly",
} as const;

export type FlexJustify = (typeof FlexJustify)[keyof typeof FlexJustify];

export const FlexAlign = {
  Start: "flex-start",
  End: "flex-end",
  Center: "center",
  Stretch: "stretch",
  Baseline: "baseline",
} as const;

export type FlexAlign = (typeof FlexAlign)[keyof typeof FlexAlign];

export const TextAlign = {
  Left: "left",
  Center: "center",
  Right: "right",
} as const;

export type TextAlign = (typeof TextAlign)[keyof typeof TextAlign];

export const BackgroundType = {
  Linear: "linear",
} as const;

export type BackgroundType = (typeof BackgroundType)[keyof typeof BackgroundType];

export const Position = {
  Relative: "relative",
  Absolute: "absolute",
} as const;

export type Position = (typeof Position)[keyof typeof Position];

export const FlexDirection = {
  Row: "row",
  Column: "column",
} as const;

export type FlexDirection = (typeof FlexDirection)[keyof typeof FlexDirection];

export const FlexWrap = {
  NoWrap: "nowrap",
  Wrap: "wrap",
} as const;

export type FlexWrap = (typeof FlexWrap)[keyof typeof FlexWrap];

export const WidgetType = {
  View: "View",
  Flex: "Flex",
  Label: "Label",
  Button: "Button",
  Image: "Image",
  Checkbox: "Checkbox",
  Toggle: "Toggle",
  Radio: "Radio",
  ProgressBar: "ProgressBar",
  CircularProgress: "CircularProgress",
  Meter: "Meter",
  TextInput: "TextInput",
  List: "List",
  Custom: "Custom",
} as const;

export type WidgetType = (typeof WidgetType)[keyof typeof WidgetType];

export const ProgressBarOrientation = {
  Horizontal: "horizontal",
  Vertical: "vertical",
} as const;

export type ProgressBarOrientation =
  (typeof ProgressBarOrientation)[keyof typeof ProgressBarOrientation];

export const ProgressDirection = {
  Forward: "forward",
  Backward: "backward",
} as const;

export type ProgressDirection =
  (typeof ProgressDirection)[keyof typeof ProgressDirection];

export const ProgressType = {
  Determinate: "determinate",
  Indeterminate: "indeterminate",
} as const;

export type ProgressType = (typeof ProgressType)[keyof typeof ProgressType];

/** `showValue` label formatting — percent, 0–1 fraction, or raw value. */
export const ProgressValueType = {
  Percent: "percent",
  Fraction: "fraction",
  Value: "value",
} as const;

export type ProgressValueType =
  (typeof ProgressValueType)[keyof typeof ProgressValueType];

export const CircularProgressDirection = {
  Clockwise: "clockwise",
  CounterClockwise: "counterclockwise",
} as const;

export type CircularProgressDirection =
  (typeof CircularProgressDirection)[keyof typeof CircularProgressDirection];

export const SizeUnit = {
  Pixel: "px",
  EM: "em",
  REM: "rem",
  Percentage: "%",
} as const;

export type SizeUnit = (typeof SizeUnit)[keyof typeof SizeUnit];

export const SpacingType = {
  Padding: "padding",
  Margin: "margin",
} as const;

export type SpacingType = (typeof SpacingType)[keyof typeof SpacingType];

export const PointerEvents = {
  Auto: "auto",
  None: "none",
} as const;

export type PointerEvents = (typeof PointerEvents)[keyof typeof PointerEvents];

export const ListOrientation = {
  Horizontal: "horizontal",
  Vertical: "vertical",
} as const;

export type ListOrientation = (typeof ListOrientation)[keyof typeof ListOrientation];

export const Overflow = {
  Auto: "auto",
  Scroll: "scroll",
  Visible: "visible",
  Hidden: "hidden",
} as const;

export type Overflow = (typeof Overflow)[keyof typeof Overflow];
