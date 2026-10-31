/** Reconcilable widget trees + interaction contract. */
import type { WidgetDescriptor } from "@tsgui/layout";

export type Key = string | number;

/**
 * Interaction handlers carried on descriptors. Phase 4's dispatch reads
 * them; factories forward them so consumers never re-attach.
 */
export interface InteractionProps {
  onPointerDown?(payload: { x: number; y: number }): void;
  onPointerUp?(payload: { x: number; y: number }): void;
  onPointerMove?(payload: { x: number; y: number }): void;
  onClick?(payload: { x: number; y: number }): void;
  onPointerEnter?(payload: { x: number; y: number }): void;
  onPointerLeave?(payload: { x: number; y: number }): void;
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
