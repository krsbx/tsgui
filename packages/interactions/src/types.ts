/** Interaction contracts — ported from flying-pan's flying/interactions. */
import type { KeyModifiers, MouseButton } from "@vulcania/core";
import type { KeyboardInputKind, PointerInputKind } from "./enums.ts";

/** Decoded input-device pointer events, fed to the dispatcher per frame. */
export interface PointerInputEvent {
  kind: PointerInputKind;
  x: number;
  y: number;
  /** SDL button code — set on down/up, absent on moves. */
  button?: MouseButton;
}

/** Decoded keyboard events, fed to the focus dispatcher per frame. */
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
