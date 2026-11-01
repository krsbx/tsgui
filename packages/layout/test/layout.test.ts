import { describe, expect, test } from "bun:test";
import {
  FlexDirection,
  FlexJustify,
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  type TextStyle,
  TextWrap,
  type WidgetDescriptor,
  WidgetType,
} from "../src/index.ts";

function makeContext(): LayoutContext {
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

function view(
  style: WidgetDescriptor["style"],
  children?: WidgetDescriptor[]
): WidgetDescriptor {
  return { type: WidgetType.View, props: {}, style, children };
}

function label(text: string, style: TextStyle = {}): WidgetDescriptor {
  return { type: WidgetType.Label, props: { text }, style };
}

describe("layoutFlex (headless)", () => {
  test("row: two fixed children side by side", () => {
    const ctx = makeContext();
    const tree = view(
      { width: 200, height: 100, flexDirection: FlexDirection.Row },
      [view({ width: 60, height: 40 }), view({ width: 80, height: 50 })]
    );

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 200,
      availableHeight: 100,
      ctx,
    });

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
    const tree = view({ width: 300, flexDirection: "column" }, [
      view({ width: 100, height: 40 }),
      view({ width: 100, height: 60 }),
    ]);

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 300,
      availableHeight: 600,
      ctx,
    });

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

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 300,
      availableHeight: 100,
      ctx,
    });

    expect(root.children[0]!.x).toBe(100); // (300-100)/2
  });

  test("flex grow distributes free space", () => {
    const ctx = makeContext();
    const tree = view(
      { width: 300, height: 100, flexDirection: FlexDirection.Row },
      [view({ height: 50, flex: 1 }), view({ width: 100, height: 50 })]
    );

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 300,
      availableHeight: 100,
      ctx,
    });

    expect(root.children[0]!.width).toBe(200); // 300 - 100
    expect(root.children[1]!.x).toBe(200);
  });

  test("label measures via injected ctx.measureText", () => {
    const ctx = makeContext();
    const tree = view({ flexDirection: "column" }, [label("hello")]);

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 500,
      availableHeight: 500,
      ctx,
    });

    // stub: 5 chars × 10px
    expect(root.children[0]!.width).toBe(50);
    expect(root.children[0]!.height).toBe(20);
  });

  test("wrap breaks into lines", () => {
    const ctx = makeContext();
    const tree = view(
      {
        width: 250,
        height: 400,
        flexWrap: "wrap",
        flexDirection: FlexDirection.Row,
      },
      [
        view({ width: 100, height: 50 }),
        view({ width: 100, height: 50 }),
        view({ width: 100, height: 50 }),
      ]
    );

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 250,
      availableHeight: 400,
      ctx,
    });

    expect(root.children[0]!.x).toBe(0);
    expect(root.children[0]!.y).toBe(0);
    expect(root.children[1]!.x).toBe(100);
    expect(root.children[2]!.x).toBe(0);
    expect(root.children[2]!.y).toBe(50); // wrapped to line 2
  });

  test("absolute child positions against padding box", () => {
    const ctx = makeContext();
    const tree = view({ width: 200, height: 200 }, [
      view({ width: 50, height: 50 }),
      {
        type: WidgetType.View,
        props: {},
        style: {
          position: "absolute",
          left: 30,
          top: 40,
          width: 60,
          height: 60,
        },
      },
    ]);

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 200,
      availableHeight: 200,
      ctx,
    });

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

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 200,
      availableHeight: 100,
      ctx,
    });
    const list = root.children[0]!;

    // scrollPos 0: firstVisible = max(0, 0-2) = 0, lastVisible = ceil(100/20)+2 = 7
    // → 7 items + 1 trailing spacer = 8
    expect(list.children!.length).toBe(8);
    // synthetic stableIds are negative
    for (const child of list.children!) {
      expect(child.stableId).toBeLessThan(0);
    }
  });

  test("nested auto containers size to content (web intrinsic sizing)", () => {
    const ctx = makeContext();

    // Row (auto) → column group (auto) → three fixed-size items; the row
    // must occupy the group's content height so the next sibling lands
    // BELOW it, not overlapping (the radio-group-over-slider bug).
    const tree = view(
      {
        width: 400,
        height: 400,
        flexDirection: FlexDirection.Column,
        gap: 16,
        padding: 24,
      },
      [
        view(
          { flexDirection: FlexDirection.Row, gap: 24, alignItems: "center" },
          [
            view({ width: 16, height: 16 }),
            view({ flexDirection: FlexDirection.Column, gap: 8 }, [
              view({ width: 16, height: 18 }),
              view({ width: 16, height: 18 }),
              view({ width: 16, height: 18 }),
            ]),
          ]
        ),
        view({ width: 100, height: 24, backgroundColor: "#333" }),
      ]
    );

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 400,
      availableHeight: 400,
      ctx,
    });
    const row = root.children[0]!;
    const sibling = root.children[1]!;

    // Group: 3×18 + 2×8 gap = 70 tall, widest item 16 wide.
    const group = row.children![1]!;
    expect(group.height).toBe(70);
    expect(group.width).toBe(16);

    // Row fits its tallest child and the sibling clears it.
    expect(row.height).toBe(70);
    expect(row.width).toBe(16 + 24 + 16);
    expect(sibling.y).toBe(24 + 70 + 16);
  });
});

describe("label text wrap", () => {
  // Stub measure: 10px per char, 20px line height.
  test("overlong label wraps to the parent content width", () => {
    const ctx = makeContext();
    // "aaaa bbbb cccc dddd" = 19 chars = 190px natural; 100px holds 10.
    const tree = view({ width: 100, height: 200 }, [
      label("aaaa bbbb cccc dddd"),
    ]);

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 100,
      availableHeight: 200,
      ctx,
    });
    const text = root.children[0]!;

    expect(text.width).toBe(100);
    expect(text.height).toBe(2 * 20); // two lines at the stub line height
    expect(text.textLayout?.lines).toEqual(["aaaa bbbb", "cccc dddd"]);
    expect(text.textLayout?.lineAdvance).toBe(20);
  });

  test("textWrap: NoWrap keeps the single overflowing run", () => {
    const ctx = makeContext();
    const tree = view({ width: 100, height: 200 }, [
      label("aaaa bbbb cccc dddd", { textWrap: TextWrap.NoWrap }),
    ]);

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 100,
      availableHeight: 200,
      ctx,
    });
    const text = root.children[0]!;

    expect(text.width).toBe(190); // natural width, overflow like flying-pan
    expect(text.textLayout).toBeUndefined();
  });

  test("style.lineHeight drives the wrapped line advance", () => {
    const ctx = makeContext();
    const tree = view({ width: 100, height: 200 }, [
      label("aaaa bbbb cccc dddd", { lineHeight: 30 }),
    ]);

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 100,
      availableHeight: 200,
      ctx,
    });
    const text = root.children[0]!;

    expect(text.height).toBe(2 * 30);
    expect(text.textLayout?.lineAdvance).toBe(30);
  });

  test("fitting text never wraps and leaves no textLayout", () => {
    const ctx = makeContext();
    const tree = view({ width: 300, height: 100 }, [label("short")]);

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 300,
      availableHeight: 100,
      ctx,
    });
    const text = root.children[0]!;

    expect(text.width).toBe(50);
    expect(text.height).toBe(20);
    expect(text.textLayout).toBeUndefined();
  });
});
