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
