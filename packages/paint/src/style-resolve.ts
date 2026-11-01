/**
 * Style resolution + color helpers for the paint walk.
 *
 * resolveStyle merges pseudo-state overrides into the base style using an
 * interaction bitmask (hover/focus/pressed/checked/disabled), cached per
 * style object so static styles pay nothing after the first pass. Phase
 * 4's dispatch feeds the real interaction flags; until then they default
 * to false and the base style passes through untouched.
 */
import { colorWithOpacity, parseColor } from "@tsgui/animation";
import type { InteractionStates } from "@tsgui/core";
import type { ViewStyle } from "@tsgui/layout";

export type { InteractionStates };
// The packed-color codec lives in @tsgui/animation (interpolation needs
// channel access); re-exported here so paint consumers import unchanged.
export { colorWithOpacity, parseColor };

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
