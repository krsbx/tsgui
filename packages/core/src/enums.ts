/**
 * Core enums — the closed value sets the shared contracts speak. Runtime
 * values deliberately live here, not in the types-only contract modules
 * (see CONVENTIONS.md: const-object enums, and types files carry no
 * runtime code).
 */

/** SDL mouse button codes (SDL_MouseButtonEvent.button). */
export const MouseButton = {
  /** No button — moves and hover transitions. */
  None: 0,
  Left: 1,
  Middle: 2,
  Right: 3,
  Back: 4,
  Forward: 5,
} as const;

export type MouseButton = (typeof MouseButton)[keyof typeof MouseButton];

/**
 * Toolkit keyboard-modifier bitmask — apps translate SDL_KMOD_* (left and
 * right variants collapse; Command maps to Meta on darwin).
 */
export const KeyModifiers = {
  None: 0,
  Shift: 1,
  Control: 2,
  Meta: 4,
} as const;

export type KeyModifiers = (typeof KeyModifiers)[keyof typeof KeyModifiers];

/**
 * SDL keycodes the toolkit interprets (SDL_KeyboardEvent.key). Letters
 * are lowercase ASCII — SDL letter keycodes are not shift-affected.
 */
export const KeyCode = {
  Backspace: 8, // '\b'
  Tab: 9, // '\t'
  Enter: 13, // '\r'
  Space: 32, // ' '
  Delete: 127, // '\x7F'
  Home: 0x4000004a,
  End: 0x4000004d,
  Right: 0x4000004f,
  Left: 0x40000050,
  Down: 0x40000051,
  Up: 0x40000052,
  A: 97,
  C: 99,
  V: 118,
  X: 120,
} as const;

export type KeyCode = (typeof KeyCode)[keyof typeof KeyCode];
