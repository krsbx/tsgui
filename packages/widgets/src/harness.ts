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
import type { AnimationManager } from "@vulcania/animation";
import { StateStore } from "@vulcania/core";
import type { ReconcilableWidget } from "@vulcania/core";
import {
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  type Size,
} from "@vulcania/layout";
import type { InteractionStates, Painter, TextPainter } from "@vulcania/paint";
import { paintTree } from "@vulcania/paint";
import { widgetPainters } from "./painters.ts";
import { Reconciler } from "./reconciler.ts";

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
  measureText?(text: string, style: unknown, fontName?: string): Size;
  getImageSize?(src: string): Size | null;
  /** Per-node interaction flags; defaults to all-off. */
  statesOf?(node: LayoutNode): InteractionStates;
  /** The transition engine — phases for indeterminate/caret painting. */
  animationManager?: AnimationManager;
  /** Named-font lookup for Label.font resolution (none → default font). */
  fonts?: (name: string) => TextPainter | undefined;
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
  const stateStore = new StateStore();
  const reconciler = new Reconciler(stateStore);
  const reconciled = reconciler.reconcile(widget);

  const layoutIndex = new Map<number, LayoutNode>();
  const ctx: LayoutContext = {
    layoutIndex,
    focusableNodes: [],
    scrollOffsetOf: () => ({ x: 0, y: 0 }),
    getStableId: reconciler.getStableId,
    // Font-aware: when fonts are injected, a fontName resolves through
    // them (mirroring AppWindow's production wiring) so label layout
    // and label paint measure the same font.
    measureText: (text, style, fontName) => {
      if (fontName && options.fonts) {
        const named = options.fonts(fontName);
        if (named?.measure) return named.measure(text);
      }
      return (options.measureText ?? DEFAULT_MEASURE)(text, style);
    },
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
  paintTree(
    {
      gpu,
      font,
      statesOf: options.statesOf,
      stateStore: stateStore,
      painters: widgetPainters,
      animationManager: options.animationManager,
      // Named-font DRAWS route through the harness's recording font so
      // paint ops are captured; the named font contributes its measure.
      fonts: options.fonts
        ? (name) => {
            const named = options.fonts!(name);
            return named
              ? {
                  draw: (_gpu, o) => font.draw(_gpu, o),
                  measure: named.measure,
                }
              : undefined;
          }
        : undefined,
    },
    root
  );

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
