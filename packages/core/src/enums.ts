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

// KeyCode is GENERATED from the scanned SDLK_ defines — a new SDL
// version that moves a code is picked up by the next
// `bun run codegen:sdl` (see ../generated/keycodes.ts).
export { KeyCode } from "./generated/keycodes.ts";
