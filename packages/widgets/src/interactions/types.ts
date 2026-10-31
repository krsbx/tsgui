/** Interaction contracts — ported from flying-pan's flying/interactions. */
import type { MouseButton } from "../types.ts";

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
