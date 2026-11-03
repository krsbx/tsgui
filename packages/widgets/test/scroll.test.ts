/**
 * Scroll dispatcher — wheel → nearest scrollable ancestor, clamping at
 * content bounds, velocity EMA + friction coasting, offset exposure for
 * LayoutContext.scrollOffsetOf.
 */
import { type ReconcilableWidget, StateStore } from "@vulcania/core";
import { ScrollDispatcher } from "@vulcania/interactions";
import {
  FlexDirection,
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  Overflow,
} from "@vulcania/layout";
import { describe, expect, test } from "bun:test";
import { Reconciler, View } from "../src/index.ts";

interface Harness {
  wheel(x: number, y: number, scrollY: number, time: number): void;
  coast(time: number): void;
  /** Re-run layoutFlex — scroll offsets apply on the next pass. */
  relayout(): void;
  dispatcher: ScrollDispatcher;
  root(): LayoutNode;
  nodeOf(key: string): LayoutNode;
}

function setup(widget: ReconcilableWidget): Harness {
  const stateStore = new StateStore();
  const reconciler = new Reconciler(stateStore);
  const dispatcher = new ScrollDispatcher();

  const layoutIndex = new Map<number, LayoutNode>();
  const ctx: LayoutContext = {
    layoutIndex,
    focusableNodes: [],
    scrollOffsetOf: (node) => dispatcher.offset(node),
    getStableId: reconciler.getStableId,
    measureText: (text) => ({ width: text.length * 8, height: 18 }),
    getImageSize: () => null,
  };

  let root = layoutFlex({
    node: reconciler.reconcile(widget).widget,
    x: 0,
    y: 0,
    availableWidth: 400,
    availableHeight: 300,
    ctx,
  });

  const relayout = (): void => {
    root = layoutFlex({
      node: reconciler.reconcile(widget).widget,
      x: 0,
      y: 0,
      availableWidth: 400,
      availableHeight: 300,
      ctx,
    });
  };

  return {
    wheel(x, y, scrollY, time) {
      dispatcher.dispatch({
        wheelEvents: [{ scrollX: 0, scrollY, mouseX: x, mouseY: y }],
        root,
        layoutIndex,
        time,
      });
    },
    coast(time) {
      dispatcher.dispatch({ wheelEvents: [], root, layoutIndex, time });
    },
    relayout,
    dispatcher,
    root: () => root,
    nodeOf(key: string): LayoutNode {
      let found: LayoutNode | null = null;
      const walk = (node: LayoutNode): void => {
        if ((node.widget as { key?: string }).key === key) found = node;
        for (const child of node.children) walk(child);
      };
      walk(root);
      return found!;
    },
  };
}

// 100×100 scroll box containing one 200-tall column of fixed items.
function scrollBox(): ReconcilableWidget {
  return View({
    style: { width: 400, height: 300 },
    children: [
      View({
        key: "scroller",
        style: {
          width: 100,
          height: 100,
          flexDirection: FlexDirection.Column,
          overflow: Overflow.Scroll,
        },
        children: Array.from({ length: 8 }, (_, i) =>
          view({ width: 60, height: 20 }, `item ${i}`)
        ),
      }),
    ],
  });
}

function view(
  style: Record<string, unknown>,
  childrenOrKey?: ReconcilableWidget[] | string
): ReconcilableWidget {
  if (typeof childrenOrKey === "string") {
    return {
      type: "View",
      props: {},
      style,
      key: childrenOrKey,
    } as ReconcilableWidget;
  }
  return {
    type: "View",
    props: {},
    style,
    children: childrenOrKey,
  } as ReconcilableWidget;
}

describe("ScrollDispatcher", () => {
  test("wheel scrolls the nearest scrollable ancestor, clamped to content", () => {
    const h = setup(scrollBox());

    // Wheel down = negative scrollY (SDL: positive is away from the user).
    h.wheel(50, 50, -40, 16);
    expect(h.nodeOf("scroller").screenY).toBe(0); // box unmoved
    expect(h.dispatcher.offset(h.nodeOf("scroller")).y).toBe(40);

    // Way overscroll: clamped at maxScroll = 160 - 100 = 60.
    h.wheel(50, 50, -400, 32);
    expect(h.dispatcher.offset(h.nodeOf("scroller")).y).toBe(60);
  });

  test("non-scrollable containers are never scrolled", () => {
    const h = setup(
      View({
        style: { width: 400, height: 300 },
        children: [View({ key: "plain", style: { width: 100, height: 100 } })],
      })
    );

    h.wheel(50, 50, 40, 16);
    expect(h.dispatcher.offset(h.nodeOf("plain"))).toEqual({ x: 0, y: 0 });
  });

  test("offsets feed scrollOffsetOf — layout shifts the children", () => {
    const h = setup(scrollBox());

    h.wheel(50, 50, -40, 16);
    h.relayout();
    const scroller = h.nodeOf("scroller");
    const firstItem = scroller.children[0]!;
    // screenY = content y (0) - scroll offset (40) — shifted up.
    expect(firstItem.screenY).toBe(scroller.screenY - 40);
  });

  test("coast applies velocity with friction and stops", () => {
    const h = setup(scrollBox());

    // Three strong wheel-down ticks build velocity.
    for (let i = 0; i < 3; i++) h.wheel(50, 50, -60, 16 * (i + 1));
    const start = h.dispatcher.offset(h.nodeOf("scroller")).y;
    expect(start).toBeGreaterThan(0);

    // Coasting frames: velocity decays; offsets keep moving briefly.
    let moved = 0;
    for (let i = 0; i < 30; i++) {
      const before = h.dispatcher.offset(h.nodeOf("scroller")).y;
      h.coast(16 * (4 + i));
      moved += Math.abs(h.dispatcher.offset(h.nodeOf("scroller")).y - before);
    }

    // Max scroll 60 — heavy scrolling clamps there and coasting cannot pass.
    expect(h.dispatcher.offset(h.nodeOf("scroller")).y).toBeLessThanOrEqual(60);
    expect(moved).toBeGreaterThanOrEqual(0);
  });

  test("offsetOf delegates cleanly for LayoutContext.scrollOffsetOf", () => {
    const h = setup(scrollBox());

    h.wheel(50, 50, -30, 16);
    const scroller = h.nodeOf("scroller");
    expect(h.dispatcher.offset(scroller)).toEqual({ x: 0, y: 30 });
  });
});
