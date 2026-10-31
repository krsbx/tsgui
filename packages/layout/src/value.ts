/** Value→ratio math shared by progress/slider-style widgets. */
import { clamp } from "./style-resolve.ts";

/** Normalize `value` into [0, 1] against min/max, clamped. */
export function valueToRatio(options: {
  value: number;
  min: number;
  max: number;
}): number {
  const { value, min, max } = options;
  const span = max - min;
  const ratio = span === 0 ? 0 : (value - min) / span;

  return clamp({ value: ratio, min: 0, max: 1 });
}
