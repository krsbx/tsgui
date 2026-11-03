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
import type { PointerPayload } from "@vulcania/core";
import { valueToRatio } from "@vulcania/layout";
import { HANDLE_SIZE, isOnBarHandle, pointerToValue } from "./geometry.ts";

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

export const RangeHandle = {
  Low: "low",
  High: "high",
} as const;

export type RangeHandle = (typeof RangeHandle)[keyof typeof RangeHandle];

export interface RangeDragValueHandlerOptions {
  disabled?: boolean;
  /** Currently committed controlled [low, high]. */
  value: [number, number] | undefined;
  min: number;
  max: number;
  step?: number;
  isVertical: boolean;
  onChange?(value: [number, number]): void;
}

/**
 * RangeSlider drag contract — flying-pan's createRangeSliderBarPointer
 * handler over the shared geometry. Two-tier grab on press: a handle
 * rect hit wins (low checked first, so coincident handles pick low),
 * otherwise the nearest handle by pixel distance — and the picked
 * handle jumps to the pointer. Drags clamp so handles can meet but
 * never cross.
 *
 * `activeHandle` rides the StateStore under the stableId — flying-pan
 * persists it the same way — because a controlled app rebuilds the
 * descriptor on every change, and a closure alone would forget the
 * grabbed handle mid-drag (the drag would freeze until release). The
 * closure value is the fallback for stateless callers (tests). Same
 * per-descriptor lifecycle for `lastApplied` as the single handler.
 */
export function createRangeDragValueHandler(
  options: RangeDragValueHandlerOptions
): DragValueHandler {
  let activeHandle: RangeHandle | null = null;
  let lastApplied: [number, number] | null = null;

  const committed = (): [number, number] =>
    options.value ?? [options.min, options.max];

  const isVertical = options.isVertical;

  const rememberedHandle = (payload: PointerPayload): RangeHandle | null => {
    const stored = payload.stateStore?.stateFor<RangeHandle | null>({
      stableId: payload.stableId,
      initial: null,
    });
    return stored ?? activeHandle;
  };

  /** Handle rect hit first; else nearest handle by pixel (tie → low). */
  const pick = (
    payload: PointerPayload
  ): { handle: RangeHandle; onHandle: boolean } => {
    const [low, high] = committed();
    const ratio = (v: number): number =>
      valueToRatio({ value: v, min: options.min, max: options.max });

    if (
      isOnBarHandle({
        x: payload.x,
        y: payload.y,
        node: payload.node,
        ratio: ratio(low),
        isVertical,
      })
    ) {
      return { handle: RangeHandle.Low, onHandle: true };
    }

    if (
      isOnBarHandle({
        x: payload.x,
        y: payload.y,
        node: payload.node,
        ratio: ratio(high),
        isVertical,
      })
    ) {
      return { handle: RangeHandle.High, onHandle: true };
    }

    const pointer = isVertical ? payload.y : payload.x;
    // Vertical mirrors: top = max, so the position uses (1 - ratio).
    const center = (v: number): number => {
      const r = ratio(v);
      return isVertical
        ? payload.node.screenY +
            (1 - r) * (payload.node.height - HANDLE_SIZE) +
            HANDLE_SIZE / 2
        : payload.node.screenX +
            r * (payload.node.width - HANDLE_SIZE) +
            HANDLE_SIZE / 2;
    };

    return {
      handle:
        Math.abs(pointer - center(low)) <= Math.abs(pointer - center(high))
          ? RangeHandle.Low
          : RangeHandle.High,
      onHandle: false,
    };
  };

  const apply = (payload: PointerPayload, handle: RangeHandle): void => {
    if (options.disabled) return;

    const raw = pointerToValue({
      coord: isVertical ? payload.y : payload.x,
      start: isVertical ? payload.node.screenY : payload.node.screenX,
      length: isVertical ? payload.node.height : payload.node.width,
      flip: isVertical,
      min: options.min,
      max: options.max,
      step: options.step,
    });

    const [low, high] = committed();
    // Handles can meet but never cross.
    const next: [number, number] =
      handle === RangeHandle.Low
        ? [Math.min(raw, high), high]
        : [low, Math.max(raw, low)];
    const prev = lastApplied ?? committed();
    if (next[0] === prev[0] && next[1] === prev[1]) return;
    lastApplied = next;
    options.onChange?.(next);
  };

  return {
    onClick: (payload) => {
      if (options.disabled) return;
      const picked = pick(payload);
      if (!picked.onHandle) apply(payload, picked.handle);
    },
    onPointerDown: (payload) => {
      if (options.disabled) return;
      const picked = pick(payload);
      activeHandle = picked.handle;
      // Survives the rebuild every controlled change triggers.
      payload.stateStore?.setState({
        stableId: payload.stableId,
        value: picked.handle,
      });
      // Handle press drags from the current value; track press jumps.
      if (!picked.onHandle) apply(payload, picked.handle);
      payload.capturePointer?.();
    },
    onPointerMove: (payload) => {
      if (!payload.captured) return;
      const handle = rememberedHandle(payload);
      if (handle === null) return;
      apply(payload, handle);
    },
  };
}
