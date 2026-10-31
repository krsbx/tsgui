/**
 * Pointer dispatcher — ported from flying-pan's
 * interactions/dispatcher/pointer, adapted from a GLFW input manager to
 * decoded, event-fed input so it stays headless-testable.
 *
 * Semantics preserved: hover enter/leave with press cancellation on
 * drag-off, press capture (down captures, up routes to the capture
 * target), click = down+up on the same widget with the same button, and
 * double/triple-click counting inside the 500 ms window.
 */
import type { LayoutNode } from "@tsgui/layout";
import type { InteractionStates } from "../style-resolve.ts";
import type { PointerPayload, ReconcilableWidget } from "../types.ts";
import { MouseButton } from "../types.ts";
import { hitTest } from "./hit-test.ts";
import { type PointerInputEvent, PointerInputKind } from "./types.ts";

const DOUBLE_CLICK_MS = 500;

const TRACKED_BUTTONS = [
  MouseButton.Left,
  MouseButton.Right,
  MouseButton.Middle,
] as const;

interface LastClick {
  stableId: number;
  button: MouseButton;
  time: number;
  count: number;
}

export interface PointerDispatchOptions {
  events: readonly PointerInputEvent[];
  root: LayoutNode;
  /** stableId → node, populated pre-order during layoutFlex. */
  layoutIndex: Map<number, LayoutNode>;
}

export class PointerDispatcher {
  private hoveredId: number | null = null;
  private pressedId: number | null = null;
  private pressedButton: MouseButton | null = null;
  private capturedId: number | null = null;
  private capturedButton: MouseButton | null = null;
  private lastClick: LastClick | null = null;

  public dispatch(options: PointerDispatchOptions): void {
    for (const event of options.events) {
      this.dispatchEvent(event, options);
    }
  }

  private dispatchEvent(
    event: PointerInputEvent,
    options: PointerDispatchOptions
  ): void {
    const { root, layoutIndex } = options;
    const hit = hitTest({ node: root, x: event.x, y: event.y });
    const hitId = hit?.stableId ?? null;

    // --- Hover enter / leave (compared by stableId, not LayoutNode) ---

    if (hitId !== this.hoveredId) {
      const prevNode = this.hoveredId
        ? (layoutIndex.get(this.hoveredId) ?? null)
        : null;

      if (prevNode) {
        this.fire("onPointerLeave", prevNode, event);
      }

      // Press cancellation: leaving a pressed widget cancels the press —
      // matches HTML :active. Capture overrides drag-off cancellation.
      if (
        this.pressedId !== null &&
        this.pressedId === this.hoveredId &&
        this.pressedId !== this.capturedId
      ) {
        this.pressedId = null;
        this.pressedButton = null;
      }

      this.hoveredId = hitId;

      if (hit) {
        this.fire("onPointerEnter", hit, event);
      }
    }

    const widget = (node: LayoutNode): ReconcilableWidget =>
      node.widget as ReconcilableWidget;

    switch (event.kind) {
      // --- Pointer move: captured widget first, else the hit target ---
      case PointerInputKind.Move: {
        const moveTarget =
          (this.capturedId !== null
            ? layoutIndex.get(this.capturedId)
            : undefined) ?? hit;

        if (moveTarget) {
          widget(moveTarget).onPointerMove?.(payload(moveTarget, event, 0));
        }
        break;
      }

      // --- Button down: press; capture only if the widget opts in ---
      case PointerInputKind.Down: {
        if (event.button === undefined) break;
        for (const button of TRACKED_BUTTONS) {
          if (event.button !== button) continue;

          if (hit) {
            widget(hit).onPointerDown?.({
              ...payload(hit, event, 0),
              capturePointer: () => {
                this.capturedId = hitId;
                this.capturedButton = button;
              },
            });
          }

          this.pressedId = hitId;
          this.pressedButton = button;
        }
        break;
      }

      // --- Button up: route to capture target, click on press match ---
      case PointerInputKind.Up: {
        if (event.button === undefined) break;
        for (const button of TRACKED_BUTTONS) {
          if (event.button !== button) continue;

          const isCaptured =
            this.capturedId !== null && button === this.capturedButton;
          const clickNode =
            (isCaptured ? layoutIndex.get(this.capturedId!) : undefined) ?? hit;
          const clickId = isCaptured ? this.capturedId : hitId;

          if (clickNode) {
            widget(clickNode).onPointerUp?.(
              payload(clickNode, event, 0, isCaptured)
            );

            // Click = down and up on the same widget with the same button.
            if (
              clickId !== null &&
              clickId === this.pressedId &&
              button === this.pressedButton
            ) {
              widget(clickNode).onClick?.(
                payload(clickNode, event, this.nextClickCount(clickId, button))
              );
            }
          }

          if (button === this.capturedButton) {
            this.capturedId = null;
            this.capturedButton = null;
          }

          if (button === this.pressedButton) {
            this.pressedId = null;
            this.pressedButton = null;
          }
        }
        break;
      }
    }
  }

  public reset(): void {
    this.hoveredId = null;
    this.pressedId = null;
    this.pressedButton = null;
    this.capturedId = null;
    this.capturedButton = null;
    this.lastClick = null;
  }

  /** Interaction flags for the paint walk — hover/press by stableId. */
  public statesOf(node: LayoutNode): InteractionStates {
    return {
      hovered: node.stableId === this.hoveredId,
      pressed: node.stableId === this.pressedId,
      focused: false,
      checked: false,
      disabled: false,
    };
  }

  public get hoveredStableId(): number | null {
    return this.hoveredId;
  }

  public get pressedStableId(): number | null {
    return this.pressedId;
  }

  public get capturedStableId(): number | null {
    return this.capturedId;
  }

  private fire(
    handler: "onPointerEnter" | "onPointerLeave",
    node: LayoutNode,
    event: PointerInputEvent
  ): void {
    (node.widget as ReconcilableWidget)[handler]?.(payload(node, event, 0));
  }

  private nextClickCount(stableId: number, button: MouseButton): number {
    const now = performance.now();

    if (
      this.lastClick &&
      this.lastClick.stableId === stableId &&
      this.lastClick.button === button &&
      now - this.lastClick.time <= DOUBLE_CLICK_MS
    ) {
      this.lastClick.count++;
      this.lastClick.time = now;

      return this.lastClick.count;
    }

    this.lastClick = { stableId, button, time: now, count: 1 };

    return 1;
  }
}

function payload(
  node: LayoutNode,
  event: PointerInputEvent,
  count: number,
  captured = false
): PointerPayload {
  return {
    x: event.x,
    y: event.y,
    button: event.button ?? MouseButton.None,
    count,
    stableId: node.stableId,
    node,
    captured,
  };
}
