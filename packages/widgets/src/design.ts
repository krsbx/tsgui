/**
 * Design tokens — Tailwind-flavored palette + toolkit metrics.
 *
 * All widget defaults reference `Palette` / `Metrics` rather than
 * re-literalizing values, so a theme bump touches one file.
 */
export const Palette = {
  // Surfaces
  surface: "#ffffff",
  surfaceHover: "#f3f4f6",
  surfaceActive: "#e5e7eb",

  // Borders
  border: "#d1d5db",
  borderFocus: "#3b82f6",

  // Text
  text: "#1f2937",
  textMuted: "#6b7280",
  textOnAccent: "#ffffff",

  // Accent
  accent: "#3b82f6",
  accentHover: "#2563eb",
  accentActive: "#1d4ed8",

  // Selection
  selection: "#bfdbfe",

  success: "#22c55e",
  warning: "#eab308",
  error: "#ef4444",
} as const;

export type PaletteColor = keyof typeof Palette;

/** Meter health zones — values index {@link Palette}. */
export const MeterZone = {
  Success: "success",
  Warning: "warning",
  Error: "error",
} as const;

export type MeterZone = (typeof MeterZone)[keyof typeof MeterZone];

export const Metrics = {
  borderWidth: 1,
  borderWidthThick: 2,
  controlRadius: 4,
  buttonRadius: 6,
  buttonWidth: 88,
  buttonHeight: 32,
  inputRadius: 4,
  defaultPadding: 8,
  controlSize: 16,
} as const;

export type MetricKey = keyof typeof Metrics;

/** Threshold color stop — the stop with the highest `at ≤ ratio` wins. */
export interface ColorStop {
  /** Position along the track in [0, 1] (post-clamp ratio). */
  at: number;
  color: string;
}

/**
 * Shared pseudo-state overlays — the disabled/focus style blocks every
 * control bakes. Each helper layers the user's own override LAST so
 * custom pseudo-states win, matching the factory spread order.
 */

/** `_disabled` overlay: dims the control to half opacity. */
export function disabledStyle<T extends { _disabled?: object }>(
  style: T | undefined
): NonNullable<T["_disabled"]> {
  return {
    opacity: 0.5,
    ...style?._disabled,
  } as NonNullable<T["_disabled"]>;
}

/** `_focus` overlay: the toolkit focus ring border color, plus extras
 *  (e.g. Button also swaps the background) — user overrides win. */
export function focusStyle<T extends { _focus?: object }>(
  style: T | undefined,
  extra?: Omit<NonNullable<T["_focus"]>, keyof T["_focus"]> & object
): NonNullable<T["_focus"]> {
  return {
    borderColor: Palette.borderFocus,
    ...extra,
    ...style?._focus,
  } as NonNullable<T["_focus"]>;
}

/** `focusable` flag — controls are focusable unless disabled. */
export function focusableWhen(enabled: boolean | undefined): boolean {
  return enabled !== false;
}
