/**
 * Reconcilable widget trees — the generated-style descriptor extended
 * with keyed matching and lifecycle hooks. Layout consumes the base
 * contract; the reconciler adds identity + lifecycle.
 */
import type { WidgetDescriptor } from "@tsgui/layout";

export type Key = string | number;

export interface WidgetLifecyclePayload {
  widget: ReconcilableWidget;
  stableId: number;
}

export interface WidgetUpdatePayload extends WidgetLifecyclePayload {
  prev: WidgetDescriptor;
}

export interface ReconcilableWidget extends WidgetDescriptor {
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
