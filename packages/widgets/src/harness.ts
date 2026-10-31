/**
 * Headless harness — the full pipeline with a null GPU:
 *
 *   widget tree → Reconciler → layoutFlex → recorded paint ops
 *
 * `renderHeadless` needs no window, no SDL, no FFI: text measurement and
 * interaction states are injected (or defaulted), and every draw call is
 * captured as a plain op object. That is what golden-snapshot tests diff,
 * and what phase 5's devtools can replay.
 */
import {
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  type Size,
} from "@tsgui/layout";
import type { InteractionStates, Painter, TextPainter } from "./paint.ts";
import { paintTree } from "./paint.ts";
import { Reconciler } from "./reconciler.ts";
import { StateStore } from "./state.ts";
import type { ReconcilableWidget } from "./types.ts";

/** Recorded draw-call discriminators. */
export const PaintOpKind = {
  Rect: "rect",
  RoundedRect: "rrect",
  Texture: "tex",
  Text: "text",
  Arc: "arc",
  Ring: "ring",
} as const;

export type PaintOpKind = (typeof PaintOpKind)[keyof typeof PaintOpKind];

/** One recorded draw call. Colors are packed u32s — see `parseColor`. */
export type PaintOp =
  | {
      op: PaintOpKind;
      x: number;
      y: number;
      w: number;
      h: number;
      color: number;
    }
  | {
      op: PaintOpKind;
      x: number;
      y: number;
      w: number;
      h: number;
      radius: number;
      color: number;
    }
  | {
      op: PaintOpKind;
      texture: unknown;
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | { op: PaintOpKind; x: number; y: number; text: string; tint: number }
  | {
      op: PaintOpKind;
      cx: number;
      cy: number;
      radius: number;
      innerRadius?: number;
      startAngle: number;
      endAngle: number;
      color: number;
    };

export interface HeadlessOptions {
  width: number;
  height: number;
  /** Defaults to a deterministic 8×18px-per-glyph estimate. */
  measureText?(text: string, style: unknown): Size;
  getImageSize?(src: string): Size | null;
  /** Per-node interaction flags; defaults to all-off. */
  statesOf?(node: LayoutNode): InteractionStates;
}

export interface HeadlessFrame {
  root: LayoutNode;
  /** Paint ops in pre-order — the golden-snapshot surface. */
  ops: PaintOp[];
  layoutIndex: Map<number, LayoutNode>;
  reconciler: Reconciler;
  /** False when the same descriptor reference was reconciled again. */
  changed: boolean;
}

const DEFAULT_MEASURE = (text: string): Size => ({
  width: text.length * 8,
  height: 18,
});

export function renderHeadless(
  widget: ReconcilableWidget,
  options: HeadlessOptions
): HeadlessFrame {
  const reconciler = new Reconciler(new StateStore());
  const reconciled = reconciler.reconcile(widget);

  const layoutIndex = new Map<number, LayoutNode>();
  const ctx: LayoutContext = {
    layoutIndex,
    focusableNodes: [],
    scrollOffsetOf: () => ({ x: 0, y: 0 }),
    getStableId: reconciler.getStableId,
    measureText: options.measureText ?? DEFAULT_MEASURE,
    getImageSize: options.getImageSize ?? (() => null),
  };

  const root = layoutFlex({
    node: reconciled.widget,
    x: 0,
    y: 0,
    availableWidth: options.width,
    availableHeight: options.height,
    ctx,
  });

  const ops: PaintOp[] = [];
  const gpu: Painter = {
    fillRect: (o) => ops.push({ op: PaintOpKind.Rect, ...o }),
    fillRoundedRect: (o) => ops.push({ op: PaintOpKind.RoundedRect, ...o }),
    drawTexture: (o) => ops.push({ op: PaintOpKind.Texture, ...o }),
    fillArc: (o) => ops.push({ op: PaintOpKind.Arc, ...o }),
    fillRing: (o) => ops.push({ op: PaintOpKind.Ring, ...o }),
  };
  const font: TextPainter = {
    draw: (_gpu, o) =>
      ops.push({
        op: PaintOpKind.Text,
        x: o.x,
        y: o.y,
        text: o.text,
        tint: o.tint ?? 0xffffffff,
      }),
  };
  paintTree({ gpu, font, statesOf: options.statesOf }, root);

  return { root, ops, layoutIndex, reconciler, changed: reconciler.changed };
}

export interface SerializedLayoutNode {
  type: string;
  stableId: number;
  x: number;
  y: number;
  w: number;
  h: number;
  children: SerializedLayoutNode[];
}

/** Structural layout snapshot; coordinates rounded to dodge float drift. */
export function serializeLayoutTree(node: LayoutNode): SerializedLayoutNode {
  const round = (n: number): number => Math.round(n * 100) / 100;
  return {
    type: node.widget.type,
    stableId: node.stableId,
    x: round(node.screenX),
    y: round(node.screenY),
    w: round(node.width),
    h: round(node.height),
    children: node.children.map(serializeLayoutTree),
  };
}
