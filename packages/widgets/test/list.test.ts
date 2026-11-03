/**
 * List factory — windowing over listLayoutFlex through the real
 * reconcile → layout → wheel-dispatch wiring. Virtual children never
 * reach the reconciler (injected at layout time under negative synthetic
 * stableIds), so these tests pin: only the visible window is laid out
 * and painted, scrolling advances the window, content bounds are
 * itemCount × itemSize, and stableIds are deterministic per index
 * (hover/state survives scroll-out/scroll-in).
 */
import { type ReconcilableWidget, StateStore } from "@vulcania/core";
import { ScrollDispatcher } from "@vulcania/interactions";
import {
  layoutFlex,
  ListOrientation,
  type LayoutContext,
  type LayoutNode,
  WidgetType,
} from "@vulcania/layout";
import { describe, expect, test } from "bun:test";
import { Label, List, Reconciler, renderHeadless } from "../src/index.ts";

const ITEM_SIZE = 20;
const VIEWPORT = 100;
const ITEM_COUNT = 10_000;
const OVERSCAN = 3;

interface Harness {
  wheel(scrollY: number, time: number): void;
  relayout(): void;
  dispatcher: ScrollDispatcher;
  listNode(): LayoutNode;
  /** The laid-out virtual children — spacers (View) and items (Label). */
  items(): LayoutNode[];
}

function listWidget(
  orientation?: ListOrientation,
  itemSize = ITEM_SIZE
): ReconcilableWidget {
  return List({
    itemCount: ITEM_COUNT,
    itemSize,
    overscan: OVERSCAN,
    orientation,
    style: { width: 200, height: VIEWPORT },
    renderItem: (i) => Label({ text: `item ${i}`, style: { width: "100%" } }),
  });
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

  const run = (): LayoutNode =>
    layoutFlex({
      node: reconciler.reconcile(widget).widget,
      x: 0,
      y: 0,
      availableWidth: 400,
      availableHeight: 300,
      ctx,
    });

  let root = run();

  return {
    wheel(scrollY, time) {
      dispatcher.dispatch({
        wheelEvents: [{ scrollX: 0, scrollY, mouseX: 100, mouseY: 50 }],
        root,
        layoutIndex,
        time,
      });
    },
    relayout: () => {
      root = run();
    },
    dispatcher,
    listNode() {
      let found: LayoutNode | null = null;
      const walk = (node: LayoutNode): void => {
        if (node.widget.type === WidgetType.List) found = node;
        for (const child of node.children) walk(child);
      };
      walk(root);
      return found!;
    },
    items() {
      return this.listNode().children.filter(
        (child) => child.widget.type === WidgetType.Label
      );
    },
  };
}

describe("List factory", () => {
  test("lays out only the visible window plus spacers — 10k items, 8 laid out", () => {
    const h = setup(listWidget());

    // Viewport 100 / itemSize 20 = 5 rows, + overscan 3 → items 0..7,
    // then the trailing spacer. Never 10,000 children.
    const list = h.listNode();
    expect(list.children).toHaveLength(9);
    expect(h.items().map((n) => (n.widget.props as { text: string }).text)).toEqual(
      ["item 0", "item 1", "item 2", "item 3", "item 4", "item 5", "item 6", "item 7"]
    );
    const spacer = list.children.at(-1)!;
    expect(spacer.widget.type).toBe(WidgetType.View);
    expect(spacer.height).toBe((ITEM_COUNT - 8) * ITEM_SIZE);
  });

  test("paints only the window — 10k items produce 8 text ops", () => {
    const frame = renderHeadless(listWidget(), { width: 400, height: 300 });

    const texts = frame.ops
      .filter((op) => op.op === "text")
      .map((op) => (op as { text: string }).text);
    expect(texts).toHaveLength(8);
    expect(texts[0]).toBe("item 0");
  });

  test("scrolling advances the window — leading spacer appears", () => {
    const h = setup(listWidget());

    h.wheel(-400, 16);
    h.relayout();

    // offset 400 → first = 400/20 - 3 = 17, last = ceil(500/20) + 3 = 28.
    const list = h.listNode();
    expect(list.children).toHaveLength(13); // spacer + 11 items + spacer
    const leading = list.children[0]!;
    expect(leading.widget.type).toBe(WidgetType.View);
    expect(leading.height).toBe(17 * ITEM_SIZE);
    expect(h.items()[0]!.widget.props).toMatchObject({ text: "item 17" });
    expect(h.items().at(-1)!.widget.props).toMatchObject({ text: "item 27" });
  });

  test("scroll clamps at itemCount × itemSize − viewport", () => {
    const h = setup(listWidget());

    h.wheel(-1_000_000, 16);
    const maxScroll = ITEM_COUNT * ITEM_SIZE - VIEWPORT; // 199,900
    expect(h.dispatcher.offset(h.listNode()).y).toBe(maxScroll);

    // At max scroll the window is 9992..9999: the trailing spacer is gone
    // (last === itemCount) and only the leading spacer remains.
    h.relayout();
    const list = h.listNode();
    expect(list.children).toHaveLength(9); // spacer + 8 items, no trailing
    expect(list.children[0]!.height).toBe(9992 * ITEM_SIZE);
    expect(h.items().at(-1)!.widget.props).toMatchObject({
      text: `item ${ITEM_COUNT - 1}`,
    });
  });

  test("virtual stableIds are deterministic per index across scrolls", () => {
    const h = setup(listWidget());

    h.relayout();
    const atRest = new Map(
      h.items().map((n) => [(n.widget.props as { text: string }).text, n.stableId])
    );

    h.wheel(-40, 16);
    h.relayout();
    const scrolled = new Map(
      h.items().map((n) => [(n.widget.props as { text: string }).text, n.stableId])
    );

    // Items 0..7 are visible in both windows — same index, same id,
    // and every virtual id is negative (bypasses the reconciler map).
    for (const [text, id] of atRest) {
      expect(id).toBeLessThan(0);
      expect(scrolled.get(text)).toBe(id);
    }
    for (const id of scrolled.values()) expect(id).toBeLessThan(0);
  });

  test("horizontal lists window on x and force itemSize as width", () => {
    const h = setup(listWidget(ListOrientation.Horizontal, 250));

    // Viewport 200 / itemSize 250 = 1 column, + overscan 3 → 4 items.
    const items = h.items();
    expect(items).toHaveLength(4);
    for (const item of items) expect(item.width).toBe(250);

    // Items flow along x: second item starts where the first ends.
    expect(items[1]!.x).toBe(items[0]!.x + 250);
  });
});
