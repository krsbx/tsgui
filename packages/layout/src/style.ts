/** Style model + size/spacing resolution — ported from flying-pan's widget styles. */
import type {
  FlexAlign,
  FlexDirection,
  FlexJustify,
  FlexWrap,
  Overflow,
  PointerEvents,
  Position,
} from "./enums.ts";
import { SizeUnit } from "./enums.ts";

export const SizeUnitValues = SizeUnit;

export type SizeInputWithUnit = {
  [K in keyof typeof SizeUnit]: `${number}${(typeof SizeUnit)[K]}`;
}[keyof typeof SizeUnit];

export type SizeInput = number | `${number}` | SizeInputWithUnit;

export interface Spacing {
  top: SizeInput;
  right: SizeInput;
  bottom: SizeInput;
  left: SizeInput;
}

export interface ResolvedSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type SpacingInput =
  | SizeInput
  | [SizeInput, SizeInput]
  | [SizeInput, SizeInput, SizeInput, SizeInput]
  | Spacing;

export interface GradientStop {
  position: number;
  color: ValidColor;
}

export interface Background {
  type: "linear";
  angle?: number;
  stops: GradientStop[];
}

/** Box shadow — stacked layers approximate a Gaussian falloff. */
export interface BoxShadow {
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color: ValidColor;
}

/** v1: hex/named strings. The gpu layer parses to packed u32. */
export type ValidColor = string;

export interface ViewStyle {
  // Box model
  padding?: SpacingInput;
  margin?: SpacingInput;
  width?: SizeInput;
  height?: SizeInput;
  minWidth?: SizeInput;
  minHeight?: SizeInput;
  maxWidth?: SizeInput;
  maxHeight?: SizeInput;

  // Flexbox
  flexDirection?: FlexDirection;
  justifyContent?: FlexJustify;
  alignItems?: FlexAlign;
  alignSelf?: FlexAlign;
  gap?: SizeInput;
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexWrap?: FlexWrap;

  // Visual (paint reads these; layout ignores them)
  backgroundColor?: ValidColor;
  background?: Background;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: ValidColor;
  opacity?: number;

  // Position
  position?: Position;
  x?: SizeInput;
  y?: SizeInput;
  top?: SizeInput;
  right?: SizeInput;
  bottom?: SizeInput;
  left?: SizeInput;

  // Interaction (data only — dispatch is phase 4)
  pointerEvents?: PointerEvents;
  focusable?: boolean;

  _active?: PseudoStateStyle;
  _focus?: PseudoStateStyle;
  _hover?: PseudoStateStyle;
  _checked?: PseudoStateStyle;
  _disabled?: PseudoStateStyle;

  overflow?: Overflow;

  boxShadow?: BoxShadow | BoxShadow[];
}

export interface PseudoStateStyle {
  backgroundColor?: ValidColor;
  background?: Background;
  borderColor?: ValidColor;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  color?: ValidColor;
  letterSpacing?: number;
  lineHeight?: number;
}

export interface TextStyle extends ViewStyle {
  fontSize?: number;
  color?: ValidColor;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
}

export type WidgetProps = Record<string, unknown>;

/**
 * The descriptor contract @tsgui/layout consumes. Widget packages extend
 * it with typed props; layout only reads type/style/children.
 */
export interface WidgetDescriptor {
  type: string;
  props: WidgetProps;
  style?: ViewStyle;
  children?: WidgetDescriptor[];
  /** Synthetic stableId from the layout pass (virtual list children). */
  _virtualStableId?: number;
}

export interface Coordinate2D {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TextMeasurements {
  width: number;
  height: number;
}
