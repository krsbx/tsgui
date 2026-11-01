/** Interaction contracts — ported from flying-pan's flying/interactions. */
import type { KeyModifiers, MouseButton } from "../types.ts";

/** Decoded input-device pointer events, fed to the dispatcher per frame. */
export const PointerInputKind = {
  Move: "move",
  Down: "down",
  Up: "up",
} as const;

export type PointerInputKind =
  (typeof PointerInputKind)[keyof typeof PointerInputKind];

export interface PointerInputEvent {
  kind: PointerInputKind;
  x: number;
  y: number;
  /** SDL button code — set on down/up, absent on moves. */
  button?: MouseButton;
}

/** Decoded keyboard events, fed to the focus dispatcher per frame. */
export const KeyboardInputKind = {
  KeyDown: "keydown",
  KeyUp: "keyup",
  /** SDL_EVENT_TEXT_INPUT — `text` carries the decoded UTF-8. */
  Char: "char",
} as const;

export type KeyboardInputKind =
  (typeof KeyboardInputKind)[keyof typeof KeyboardInputKind];

/** Decoded wheel events, fed to the scroll dispatcher per frame. */
export interface WheelInputEvent {
  /** Horizontal scroll delta, positive right. */
  scrollX: number;
  /** Vertical scroll delta — SDL: positive away from the user. */
  scrollY: number;
  /** Pointer position — selects the scroll container under the cursor. */
  mouseX: number;
  mouseY: number;
}

export interface KeyboardInputEvent {
  kind: KeyboardInputKind;
  /** SDL keycode — see {@link KeyCode}. 0 for char events. */
  key: number;
  /** Decoded text — set on char events. */
  text?: string;
  modifiers: KeyModifiers;
  /** SDL auto-repeat flag on key-down. */
  repeat?: boolean;
}
