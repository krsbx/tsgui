/**
 * Slider drag contract — shared by SliderBar and CircularSlider. Ported
 * from flying-pan's widget/slider/pointer: press on the track jumps to
 * the value, press on the handle drags from the current value, captured
 * moves apply, hover moves never mutate.
 *
 * `lastApplied` dedupes event-fed moves that recompute the same position
 * several times before the app re-renders (the stale controlled `value`
 * comparison alone can't). One instance per descriptor — the state dies
 * with the rebuild, where the fresh controlled value takes over.
 */
import type { PointerPayload } from "../../types.ts";

export interface DragValueHandlerOptions {
  disabled?: boolean;
  /** Currently committed controlled value. */
  value: number | undefined;
  onChange?(value: number): void;
  /** Map a pointer position to the next (unclamped-by-caller) value. */
  positionToValue(x: number, y: number, node: PointerPayload["node"]): number;
  /** Is the pointer on the handle? False = track press → jump. */
  onHandle(x: number, y: number, node: PointerPayload["node"]): boolean;
}

export interface DragValueHandler {
  onClick(payload: PointerPayload): void;
  onPointerDown(payload: PointerPayload): void;
  onPointerMove(payload: PointerPayload): void;
}

export function createDragValueHandler(
  options: DragValueHandlerOptions
): DragValueHandler {
  let lastApplied: number | null = null;

  const apply = (payload: PointerPayload): void => {
    if (options.disabled) return;

    const next = options.positionToValue(payload.x, payload.y, payload.node);
    if (next === (lastApplied ?? options.value)) return;
    lastApplied = next;
    options.onChange?.(next);
  };

  return {
    /** Track click (not on the handle) jumps straight to the value. */
    onClick: (payload) => {
      if (options.disabled) return;
      if (!options.onHandle(payload.x, payload.y, payload.node)) {
        apply(payload);
      }
    },
    /** Track press jumps; handle press drags from current; capture on. */
    onPointerDown: (payload) => {
      if (options.disabled) return;
      if (!options.onHandle(payload.x, payload.y, payload.node)) {
        apply(payload);
      }
      payload.capturePointer?.();
    },
    /** Drag applies only while captured — hover moves don't mutate. */
    onPointerMove: (payload) => {
      if (!payload.captured) return;
      apply(payload);
    },
  };
}
