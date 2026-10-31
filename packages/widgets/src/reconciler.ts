/**
 * Tree reconciler — diffs widget trees across frames to preserve identity
 * (stableId) and dispatch lifecycle hooks. Ported from flying-pan with
 * the `window` parameter dropped; hooks receive a plain payload.
 */
import type {
  Key,
  ReconcilableWidget,
  ReconciledNode,
} from "./types.ts";
import type { StateStore } from "./state.ts";

export class Reconciler {
  private prevTree: ReconciledNode | null = null;
  /** 0 is reserved for "not reconciled". */
  private nextId = 1;
  private readonly stableIdByWidget = new Map<ReconcilableWidget, number>();
  private changed_ = false;

  public constructor(private readonly stateStore: StateStore) {}

  /**
   * Identity short-circuit: passing the same descriptor reference as last
   * frame skips all diffing (static subtrees are free).
   */
  public reconcile(next: ReconcilableWidget): ReconciledNode {
    if (next === this.prevTree?.widget) {
      this.changed_ = false;
      return this.prevTree;
    }

    this.changed_ = true;
    // Cleared each pass, not re-allocated — GC pressure.
    this.stableIdByWidget.clear();

    const result = this.reconcileNode({ prev: this.prevTree, next });
    this.prevTree = result;

    return result;
  }

  public get changed(): boolean {
    return this.changed_;
  }

  public getStableId = (widget: ReconcilableWidget): number => {
    // Virtual list items (generated during layout) bypass the map.
    if (widget._virtualStableId != null) return widget._virtualStableId;
    return this.stableIdByWidget.get(widget) ?? 0;
  };

  public reset(): void {
    this.prevTree = null;
    this.nextId = 1;
    this.changed_ = false;
    this.stableIdByWidget.clear();
  }

  private reconcileNode(options: {
    prev: ReconciledNode | null;
    next: ReconcilableWidget;
  }): ReconciledNode {
    const { prev, next } = options;

    let stableId: number;

    if (prev && prev.widget.type === next.type) {
      // Same type — preserve identity.
      stableId = prev.stableId;

      if (prev.widget !== next) {
        next.onUpdate?.({
          widget: next,
          stableId,
          prev: prev.widget,
        });
      }
    } else {
      // Type mismatch or new position — unmount prev, mount new.
      if (prev) {
        this.unmountNode(prev);
      }

      stableId = this.nextId++;
      next.onMount?.({ widget: next, stableId });
    }

    this.stableIdByWidget.set(next, stableId);

    const children = this.reconcileChildren(
      prev?.children ?? [],
      next.children ?? []
    );

    return { widget: next, stableId, children };
  }

  private reconcileChildren(
    prevChildren: ReconciledNode[],
    nextChildren: ReconcilableWidget[]
  ): ReconciledNode[] {
    // Partition prev children into keyed (cross-sibling match) and
    // unkeyed (positional match).
    const prevKeyed = new Map<Key, ReconciledNode>();
    const prevUnkeyed: ReconciledNode[] = [];

    for (const p of prevChildren) {
      const key = p.widget.key;
      if (key !== undefined) {
        prevKeyed.set(key, p);
      } else {
        prevUnkeyed.push(p);
      }
    }

    const consumedKeys = new Set<Key>();
    let unkeyedCursor = 0;
    const children: ReconciledNode[] = [];

    for (const nextChild of nextChildren) {
      const key = nextChild.key;

      if (key !== undefined) {
        consumedKeys.add(key);
        children.push(
          this.reconcileNode({ prev: prevKeyed.get(key) ?? null, next: nextChild })
        );
      } else {
        const prevNode = prevUnkeyed[unkeyedCursor] ?? null;
        unkeyedCursor++;
        children.push(this.reconcileNode({ prev: prevNode, next: nextChild }));
      }
    }

    // Unmount everything that didn't survive.
    for (const [key, prevNode] of prevKeyed) {
      if (!consumedKeys.has(key)) {
        this.unmountNode(prevNode);
      }
    }

    for (let i = unkeyedCursor; i < prevUnkeyed.length; i++) {
      const prevNode = prevUnkeyed[i];
      if (prevNode) {
        this.unmountNode(prevNode);
      }
    }

    return children;
  }

  private unmountNode(node: ReconciledNode): void {
    node.widget.onUnmount?.({
      widget: node.widget,
      stableId: node.stableId,
    });

    this.stateStore.destroy(node.stableId);

    for (const child of node.children) {
      this.unmountNode(child);
    }
  }
}
