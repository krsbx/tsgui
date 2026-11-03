/** Threshold color stops — the stop with the highest `at ≤ ratio` wins. */
import { type ColorStop, Palette } from "@vulcania/core";
import type { ValidColor, ViewStyle } from "@vulcania/layout";

export function resolveFillColor(options: {
  ratio: number;
  fillStyle?: ViewStyle;
  colorStops?: ColorStop[];
}): ValidColor {
  const { ratio, fillStyle, colorStops } = options;

  if (colorStops && colorStops.length > 0) {
    const sorted = [...colorStops].sort((a, b) => a.at - b.at);
    let picked = sorted[0]!.color;

    for (const stop of sorted) {
      if (ratio >= stop.at) picked = stop.color;
      else break;
    }

    return picked;
  }

  return fillStyle?.backgroundColor ?? Palette.accent;
}

export function resolveFillColorClamped(options: {
  ratio: number;
  fillStyle?: ViewStyle;
  colorStops?: ColorStop[];
}): ValidColor {
  const ratio = Math.max(0, Math.min(1, options.ratio));
  return resolveFillColor({
    ratio,
    fillStyle: options.fillStyle,
    colorStops: options.colorStops,
  });
}
