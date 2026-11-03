/**
 * Structural views of the App/AppWindow surfaces the inspector reads.
 * Keeping them structural (not `instanceof App`) is what makes the
 * inspector testable with plain fakes — no SDL, no window.
 */
import type { InteractionStates, StateStore } from "@vulcania/core";
import type { LayoutNode } from "@vulcania/layout";
import type { Painter } from "@vulcania/paint";

export interface InspectableWindow {
  readonly id: number;
  readonly title: string;
  /** Last laid-out root — null before the first frame. */
  readonly root: LayoutNode | null;
  /** stableId → node, rebuilt every frame; the detail view reads it. */
  readonly layoutIndex: Map<number, LayoutNode>;
  readonly renderer: {
    readonly stats: { readonly drawCalls: number; readonly vertices: number };
  };
  readonly font: { readonly cacheSize: number };
  /** The devtools seam — the server arms it for the selection outline. */
  paintOverlay: ((
    gpu: Painter,
    win: { readonly layoutIndex: Map<number, LayoutNode> }
  ) => void) | null;
  readonly pointer: { statesOf(node: LayoutNode): InteractionStates };
  readonly focus: { statesOf(node: LayoutNode): { focused: boolean } };
  readonly stateStore: StateStore;
}

export interface InspectableApp {
  readonly frames: number;
  /** Every live window, registry order. */
  readonly all: readonly InspectableWindow[];
}

/** One serialized node — a superset of the harness's structural dump. */
export interface SnapshotNode {
  stableId: number;
  type: string;
  rect: { x: number; y: number; w: number; h: number };
  text?: string;
  font?: string;
  key?: unknown;
  children: SnapshotNode[];
}

export interface WindowSnapshot {
  windowId: number;
  title: string;
  root: SnapshotNode | null;
}

export interface TreeSnapshot {
  frame: number;
  windows: WindowSnapshot[];
}
