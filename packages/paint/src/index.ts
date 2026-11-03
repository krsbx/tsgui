/**
 * @vulcania/paint — the generic rendering engine: the paintTree walk
 * (shadow → border → background → registered painter → children), the
 * structural Painter/TextPainter surfaces, style resolution, and the
 * generic fill/shape/shadow primitives. Per-widget painters live in
 * @vulcania/widgets, co-located with their widgets, injected through
 * PaintContext.painters.
 */
export {
  colorWithOpacity,
  type InteractionStates,
  paintTree,
  parseColor,
  type PaintContext,
  type Painter,
  resolveFont,
  resolveStyle,
  type TextPainter,
  type WidgetPainter,
  type WidgetPainters,
} from "./paint.ts";
export {
  type ContinuousFillOptions,
  fillRatio,
  paintContinuousFill,
  paintSteppedFill,
} from "./primitives/fill.ts";
export { fillShape, paintBackground, paintBorder } from "./primitives/shape.ts";
export { paintShadow } from "./primitives/shadow.ts";
export {
  resolveFillColor,
  resolveFillColorClamped,
} from "./primitives/color-stops.ts";
