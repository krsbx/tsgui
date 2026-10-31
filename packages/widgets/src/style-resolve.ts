/**
 * Style resolution + color helpers for the paint walk.
 *
 * resolveStyle merges pseudo-state overrides into the base style using an
 * interaction bitmask (hover/focus/pressed/checked/disabled), cached per
 * style object so static styles pay nothing after the first pass. Phase
 * 4's dispatch feeds the real interaction flags; until then they default
 * to false and the base style passes through untouched.
 */
import type { ViewStyle } from "@tsgui/layout";

export interface InteractionStates {
  hovered: boolean;
  focused: boolean;
  pressed: boolean;
  checked: boolean;
  disabled: boolean;
}

/** Parse #rgb/#rgba/#rrggbb/#rrggbbaa into the packed u32 the gpu expects. */
export function parseColor(css: string): number {
  if (css === "transparent") return 0x00000000;

  if (!css.startsWith("#")) {
    // Visible mistake color — wrong-at-a-glance beats silently black.
    return 0xff00ffff;
  }

  let hex = css.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length === 6) hex += "ff";
  if (hex.length !== 8) return 0xff00ffff;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = Number.parseInt(hex.slice(6, 8), 16);

  return (
    (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0
  );
}

/** Scale the alpha channel of a packed color (0–1 factor). */
export function colorWithOpacity(color: number, opacity: number): number {
  const a = Math.round(
    ((color >>> 24) & 255) * Math.max(0, Math.min(1, opacity))
  );
  return ((a << 24) | (color & 0x00ffffff)) >>> 0;
}

const MASK = {
  hovered: 1,
  focused: 2,
  pressed: 4,
  checked: 8,
  disabled: 16,
} as const;

const styleCache = new WeakMap<ViewStyle, Map<number, ViewStyle>>();

/**
 * Merge pseudo-state overrides into the base style per interaction mask.
 * Cached per style object + mask — static styles resolve free.
 */
export function resolveStyle(
  style: ViewStyle,
  states: InteractionStates
): ViewStyle {
  const { _hover, _focus, _active, _checked, _disabled, ...base } = style;

  if (!_hover && !_focus && !_active && !_checked && !_disabled) return base;

  let mask = 0;
  if (states.hovered) mask |= MASK.hovered;
  if (states.focused) mask |= MASK.focused;
  if (states.pressed) mask |= MASK.pressed;
  if (states.checked) mask |= MASK.checked;
  if (states.disabled) mask |= MASK.disabled;

  let perStyle = styleCache.get(style);
  if (!perStyle) {
    perStyle = new Map();
    styleCache.set(style, perStyle);
  }

  const cached = perStyle.get(mask);
  if (cached) return cached;

  let resolved: ViewStyle = base;
  if (states.hovered && _hover) resolved = { ...resolved, ..._hover };
  if (states.focused && _focus) resolved = { ...resolved, ..._focus };
  if (states.pressed && _active) resolved = { ...resolved, ..._active };
  if (states.checked && _checked) resolved = { ...resolved, ..._checked };
  if (states.disabled && _disabled) resolved = { ...resolved, ..._disabled };

  perStyle.set(mask, resolved);
  return resolved;
}
