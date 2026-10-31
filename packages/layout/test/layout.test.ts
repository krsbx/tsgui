import { describe, expect, test } from "bun:test";
import {
  FlexDirection,
  FlexJustify,
  layoutFlex,
  WidgetType,
  type LayoutContext,
  type LayoutNode,
  type WidgetDescriptor,
} from "../src/index.ts";

function makeContext() {
  const idCounter = { value: 1 };
  const ctx: LayoutContext = {
    layoutIndex: new Map<number, LayoutNode>(),
    focusableNodes: [],
    scrollOffsetOf: () => ({ x: 0, y: 0 }),
    getImageSize: () => null,
    getStableId(widget: WidgetDescriptor): number {
      const virtual = widget._virtualStableId;
      if (virtual != null) return virtual;
      return idCounter.value++;
    },
    measureText(text: string) {
      return { width: text.length * 10, height: 20 };
    },
  };
  return Object.assign(ctx, { idCounter });
}

function view(style: WidgetDescriptor["style"], children?: WidgetDescriptor[]): WidgetDescriptor {
  return { type: WidgetType.View, props: {}, style, children };
}

function label(text: string, style: WidgetDescriptor["style"] = {}): WidgetDescriptor {
  return { type: WidgetType.Label, props: { text }, style };
}

describe("layoutFlex (headless)", () => {
  test("row: two fixed children side by side", () => {
    const ctx = makeContext();
    const tree = view(
      { width: 200, height: 100, flexDirection: FlexDirection.Row },
      [view({ width: 60, height: 40 }), view({ width: 80, height: 50 })]
    );

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 200, availableHeight: 100, ctx });

    // child x/y = parent position + relative offset (flying-pan semantics)
    expect(root.width).toBe(200);
    expect(root.height).toBe(100);
    expect(root.children).toHaveLength(2);
    expect(root.children[0]!.x).toBe(0);
    expect(root.children[0]!.y).toBe(0);
    expect(root.children[1]!.x).toBe(60);
    expect(root.children[1]!.y).toBe(0);
  });

  test("column with content-fit height", () => {
    const ctx = makeContext();
    const tree = view(
      { width: 300, flexDirection: "column" },
      [view({ width: 100, height: 40 }), view({ width: 100, height: 60 })]
    );

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 300, availableHeight: 600, ctx });

    expect(root.height).toBe(100); // 40 + 60 content-fit
    expect(root.children[1]!.y).toBe(40);
  });

  test("justify center", () => {
    const ctx = makeContext();
    const tree = view(
      {
        width: 300,
        height: 100,
        flexDirection: FlexDirection.Row,
        justifyContent: FlexJustify.Center,
      },
      [view({ width: 100, height: 50 })]
    );

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 300, availableHeight: 100, ctx });

    expect(root.children[0]!.x).toBe(100); // (300-100)/2
  });

  test("flex grow distributes free space", () => {
    const ctx = makeContext();
    const tree = view(
      { width: 300, height: 100, flexDirection: FlexDirection.Row },
      [view({ height: 50, flex: 1 }), view({ width: 100, height: 50 })]
    );

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 300, availableHeight: 100, ctx });

    expect(root.children[0]!.width).toBe(200); // 300 - 100
    expect(root.children[1]!.x).toBe(200);
  });

  test("label measures via injected ctx.measureText", () => {
    const ctx = makeContext();
    const tree = view({ flexDirection: "column" }, [label("hello")]);

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 500, availableHeight: 500, ctx });

    // stub: 5 chars × 10px
    expect(root.children[0]!.width).toBe(50);
    expect(root.children[0]!.height).toBe(20);
  });

  test("wrap breaks into lines", () => {
    const ctx = makeContext();
    const tree = view(
      { width: 250, height: 400, flexWrap: "wrap", flexDirection: FlexDirection.Row },
      [
        view({ width: 100, height: 50 }),
        view({ width: 100, height: 50 }),
        view({ width: 100, height: 50 }),
      ]
    );

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 250, availableHeight: 400, ctx });

    expect(root.children[0]!.x).toBe(0);
    expect(root.children[0]!.y).toBe(0);
    expect(root.children[1]!.x).toBe(100);
    expect(root.children[2]!.x).toBe(0);
    expect(root.children[2]!.y).toBe(50); // wrapped to line 2
  });

  test("absolute child positions against padding box", () => {
    const ctx = makeContext();
    const tree = view(
      { width: 200, height: 200 },
      [
        view({ width: 50, height: 50 }),
        {
          type: WidgetType.View,
          props: {},
          style: { position: "absolute", left: 30, top: 40, width: 60, height: 60 },
        },
      ]
    );

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 200, availableHeight: 200, ctx });

    expect(root.children).toHaveLength(2);
    const abs = root.children[1]!;
    expect(abs.x).toBe(30);
    expect(abs.y).toBe(40);
  });

  test("list virtualization generates visible window + spacers", () => {
    const ctx = makeContext();
    const renderItem = (i: number) => label(`item ${i}`, { height: 20 });

    const tree = view({ width: 200, height: 100 }, [
      {
        type: WidgetType.List,
        props: { itemCount: 1000, itemSize: 20, renderItem, overscan: 2 },
        style: {},
      },
    ]);

    const root = layoutFlex({ node: tree, x: 0, y: 0, availableWidth: 200, availableHeight: 100, ctx });
    const list = root.children[0]!;

    // scrollPos 0: firstVisible = max(0, 0-2) = 0, lastVisible = ceil(100/20)+2 = 7
    // → 7 items + 1 trailing spacer = 8
    expect(list.children!.length).toBe(8);
    // synthetic stableIds are negative
    for (const child of list.children!) {
      expect(child.stableId).toBeLessThan(0);
    }
  });
});
