/** Reconcilable widget trees + interaction contract. */
import type { LayoutNode, WidgetDescriptor } from "@tsgui/layout";

export type { LayoutNode };

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

/**
 * Toolkit keyboard-modifier bitmask — apps translate SDL_KMOD_* (left and
 * right variants collapse; Command maps to Meta on darwin).
 */
export const KeyModifiers = {
  None: 0,
  Shift: 1,
  Control: 2,
  Meta: 4,
} as const;

export type KeyModifiers = (typeof KeyModifiers)[keyof typeof KeyModifiers];

/**
 * SDL keycodes the toolkit interprets (SDL_KeyboardEvent.key). Letters
 * are lowercase ASCII — SDL letter keycodes are not shift-affected.
 */
export const KeyCode = {
  Backspace: 8, // '\b'
  Tab: 9, // '\t'
  Enter: 13, // '\r'
  Space: 32, // ' '
  Delete: 127, // '\x7F'
  Home: 0x4000004a,
  End: 0x4000004d,
  Right: 0x4000004f,
  Left: 0x40000050,
  Down: 0x40000051,
  Up: 0x40000052,
  A: 97,
  C: 99,
  V: 118,
  X: 120,
} as const;

export type KeyCode = (typeof KeyCode)[keyof typeof KeyCode];

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
}

/** Payload for text (char) input — routed to the focused widget. */
export interface CharPayload {
  text: string;
  stableId: number;
  /** The laid-out focused node — geometry for edit scroll math. */
  node: LayoutNode;
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

/** Typed view of a descriptor's props bag — one cast site for the codebase. */
export function propsOf<T extends object>(widget: WidgetDescriptor): T {
  return widget.props as T;
}
