/** Reconcilable widget trees + interaction contract. */
import type { WidgetDescriptor } from "@tsgui/layout";

export type Key = string | number;

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

/** Payload carried by every pointer handler. */
export interface PointerPayload {
  x: number;
  y: number;
  button: MouseButton;
  /** Click count within the double-click window — 1 except on clicks. */
  count: number;
  /** stableId of the node the handler is routed to. */
  stableId: number;
  /**
   * onPointerDown only: capture the pointer so move/up route here until
   * release — drags (sliders) opt in; plain clicks don't, which is what
   * lets drag-off cancel a press.
   */
  capturePointer?(): void;
}

/**
 * Interaction handlers carried on descriptors. The dispatcher (phase 4)
 * reads them; factories forward them so consumers never re-attach.
 */
export interface InteractionProps {
  onPointerDown?(payload: PointerPayload): void;
  onPointerUp?(payload: PointerPayload): void;
  onPointerMove?(payload: PointerPayload): void;
  onClick?(payload: PointerPayload): void;
  onPointerEnter?(payload: PointerPayload): void;
  onPointerLeave?(payload: PointerPayload): void;
  onKeyDown?(payload: { key: string }): void;
  onKeyUp?(payload: { key: string }): void;
  onFocus?(): void;
  onBlur?(): void;
}

export interface WidgetLifecyclePayload {
  widget: ReconcilableWidget;
  stableId: number;
}

export interface WidgetUpdatePayload extends WidgetLifecyclePayload {
  prev: WidgetDescriptor;
}

export interface ReconcilableWidget extends WidgetDescriptor, InteractionProps {
  /** Keyed children match by key across sibling reorders. */
  key?: Key;
  onMount?(payload: WidgetLifecyclePayload): void;
  onUpdate?(payload: WidgetUpdatePayload): void;
  onUnmount?(payload: WidgetLifecyclePayload): void;
}

export interface ReconciledNode {
  widget: ReconcilableWidget;
  stableId: number;
  children: ReconciledNode[];
}

/** Typed view of a descriptor's props bag — one cast site for the codebase. */
export function propsOf<T extends object>(widget: WidgetDescriptor): T {
  return widget.props as T;
}
