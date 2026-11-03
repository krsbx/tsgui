/** Reconcilable widget trees + interaction contract. */
import type { LayoutNode, WidgetDescriptor } from "@vulcania/layout";
import type { KeyModifiers, MouseButton } from "./enums.ts";
import type { StateStore } from "./state.ts";

export type { LayoutNode };

export type Key = string | number;

/** Payload carried by every pointer handler. */
export interface PointerPayload {
  x: number;
  y: number;
  button: MouseButton;
  /** Click count within the double-click window — 1 except on clicks. */
  count: number;
  /** stableId of the node the handler is routed to. */
  stableId: number;
  /** The laid-out node the event routed to — geometry for drags. */
  node: LayoutNode;
  /** True while this node holds the pointer capture (drag in progress). */
  captured: boolean;
  /**
   * onPointerDown only: capture the pointer so move/up route here until
   * release — drags (sliders) opt in; plain clicks don't, which is what
   * lets drag-off cancel a press.
   */
  capturePointer?(): void;
  /** The app's state store — uncontrolled widgets persist here. */
  stateStore?: StateStore;
}

export interface WidgetLifecyclePayload {
  widget: ReconcilableWidget;
  stableId: number;
}

/** Payload for key handlers — routed to the focused widget. */
export interface KeyPayload {
  /** SDL keycode — see {@link KeyCode}. */
  key: number;
  modifiers: KeyModifiers;
  /** True while the key auto-repeats. */
  repeat: boolean;
  stableId: number;
  /** The laid-out focused node — geometry for edit scroll math. */
  node: LayoutNode;
  /** The app's state store — uncontrolled widgets persist here. */
  stateStore?: StateStore;
}

/** Payload for text (char) input — routed to the focused widget. */
export interface CharPayload {
  text: string;
  stableId: number;
  /** The laid-out focused node — geometry for edit scroll math. */
  node: LayoutNode;
  /** The app's state store — uncontrolled widgets persist here. */
  stateStore?: StateStore;
}

/** Payload for focus transitions. */
export interface FocusPayload {
  stableId: number;
  /** The focus target this widget gave up / received focus from. */
  relatedStableId: number | null;
}

/**
 * Common widget props — every factory's Props interface extends this
 * instead of re-declaring the key.
 */
export interface BaseWidgetProps extends InteractionProps {
  /** Keyed children match by key across sibling reorders. */
  key?: Key;
}

/**
 * Interaction handlers carried on descriptors. The dispatchers (phase 4)
 * read them; factories forward them so consumers never re-attach.
 */
export interface InteractionProps {
  onPointerDown?(payload: PointerPayload): void;
  onPointerUp?(payload: PointerPayload): void;
  onPointerMove?(payload: PointerPayload): void;
  onClick?(payload: PointerPayload): void;
  onPointerEnter?(payload: PointerPayload): void;
  onPointerLeave?(payload: PointerPayload): void;
  /** Released with the widget — cleanup hook for keyed edit state. */
  onUnmount?(payload: WidgetLifecyclePayload): void;
  onKeyDown?(payload: KeyPayload): void;
  onKeyUp?(payload: KeyPayload): void;
  /** Decoded text input (SDL_EVENT_TEXT_INPUT) — focused widget only. */
  onChar?(payload: CharPayload): void;
  onFocus?(payload: FocusPayload): void;
  onBlur?(payload: FocusPayload): void;
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
