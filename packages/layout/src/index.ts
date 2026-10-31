/** @tsgui/layout — CSS-like flexbox engine. Pure TypeScript, zero FFI. */
export * from "./enums.ts";
export { crossMargin, mainMargin, mainSize } from "./axis.ts";
export {
  clamp,
  layoutConstraints,
  resolveConstraint,
  resolveSize,
  resolveSpacing,
  ROOT_FONT_SIZE,
} from "./style-resolve.ts";
export type {
  Coordinate2D,
  Size,
  Background,
  BoxShadow,
  GradientStop,
  PseudoStateStyle,
  ResolvedSpacing,
  Spacing,
  SpacingInput,
  TextStyle,
  ValidColor,
  ViewStyle,
  WidgetDescriptor,
  WidgetProps,
} from "./style.ts";
export * from "./types.ts";
export { layoutFlex } from "./layout.ts";
export { listLayoutFlex, widgetLevelLayoutFlex } from "./processor/list.ts";
