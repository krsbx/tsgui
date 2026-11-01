/**
 * Interaction enums — the decoded input event discriminants. Runtime
 * values deliberately live here, not in the types-only event-contract
 * module (see CONVENTIONS.md).
 */

/** Discriminants of decoded pointer events (fed to PointerDispatcher). */
export const PointerInputKind = {
  Move: "move",
  Down: "down",
  Up: "up",
} as const;

export type PointerInputKind =
  (typeof PointerInputKind)[keyof typeof PointerInputKind];

/** Discriminants of decoded keyboard events (fed to FocusDispatcher). */
export const KeyboardInputKind = {
  KeyDown: "keydown",
  KeyUp: "keyup",
  /** SDL_EVENT_TEXT_INPUT — `text` carries the decoded UTF-8. */
  Char: "char",
} as const;

export type KeyboardInputKind =
  (typeof KeyboardInputKind)[keyof typeof KeyboardInputKind];
