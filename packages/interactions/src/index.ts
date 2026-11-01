/**
 * @tsgui/interactions — the event-fed input dispatchers. The app decodes
 * SDL events into the typed events this package consumes per frame:
 * pointer (hover/press/click/capture), focus (click-to-focus, tab
 * cycling, key/char routing), scroll (wheel → scrollable ancestor with
 * coasting), plus the hit-test they share. Pure TypeScript — headless-
 * testable, never touch SDL; contracts come from @tsgui/core.
 */
export { hitTest, type HitTestOptions } from "./hit-test.ts";
export { PointerDispatcher, type PointerDispatchOptions } from "./pointer.ts";
export {
  type KeyboardInputEvent,
  KeyboardInputKind,
  type PointerInputEvent,
  PointerInputKind,
} from "./types.ts";
export { type WheelInputEvent } from "./types.ts";
export { FocusDispatcher, type FocusDispatchOptions } from "./focus.ts";
export {
  measureContent,
  ScrollDispatcher,
  type ScrollDispatchOptions,
} from "./scroll.ts";
