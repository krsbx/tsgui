/**
 * @tsgui/animation — the style animation engine: the AnimationManager
 * transition state machine (applied by @tsgui/paint's walk through
 * PaintContext.animationManager), easing curves, and interpolation over
 * numbers and packed colors. Pure TypeScript with an injectable clock —
 * headless-testable, depends only on @tsgui/layout.
 */
export { colorWithOpacity, formatPacked, parseColor } from "./color.ts";
export { easings } from "./easing.ts";
export { interpolate } from "./interpolate.ts";
export { AnimationManager } from "./manager.ts";
export type { ActiveTransition, TransitionConfig } from "./types.ts";
