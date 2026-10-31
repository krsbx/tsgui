import { describe, expect, test } from "bun:test";
import { FlexDirection } from "@tsgui/layout";
import { layoutFlex } from "@tsgui/layout";
import type { RectOptions, TextureDrawOptions, TextDrawOptions } from "@tsgui/gpu";
import { Label, paintTree, Reconciler, StateStore, View } from "../src/index.ts";
import type { LayoutContext, LayoutNode } from "@tsgui/layout";

// ————— reconciler —————

describe("Reconciler", () => {
  test("assigns stable ids and preserves them across frames", () => {
    const reconciler = new Reconciler(new StateStore());

    const frame1 = reconciler.reconcile(
      View({ children: [Label({ text: "a" }), Label({ text: "b" })] })
    );
    const idRoot = frame1.stableId;
    const idChild = frame1.children[0]!.stableId;

    const frame2 = reconciler.reconcile(
      View({ children: [Label({ text: "a2" }), Label({ text: "b2" })] })
    );

    expect(reconciler.changed).toBe(true);
    expect(frame2.stableId).toBe(idRoot);
    expect(frame2.children[0]!.stableId).toBe(idChild);
  });

  test("identity short-circuit skips diffing for static trees", () => {
    const reconciler = new Reconciler(new StateStore());
    const tree = View({ children: [Label({ text: "static" })] });

    reconciler.reconcile(tree);
    reconciler.reconcile(tree); // same reference — free

    expect(reconciler.changed).toBe(false);
  });

  test("keyed children survive reordering", () => {
    const reconciler = new Reconciler(new StateStore());

    const frame1 = reconciler.reconcile(
      View({
        children: [
          { ...Label({ text: "one" }), key: "one" },
          { ...Label({ text: "two" }), key: "two" },
        ],
      })
    );
    const idOne = frame1.children[0]!.stableId;
    const idTwo = frame1.children[1]!.stableId;

    const frame2 = reconciler.reconcile(
      View({
        children: [
          { ...Label({ text: "two" }), key: "two" },
          { ...Label({ text: "one" }), key: "one" },
        ],
      })
    );

    // identity follows the KEY, not the position
    expect(frame2.children[0]!.stableId).toBe(idTwo);
    expect(frame2.children[1]!.stableId).toBe(idOne);
  });

  test("unmount fires hooks and destroys state", () => {
    const store = new StateStore();
    const reconciler = new Reconciler(store);

    const events: string[] = [];
    const frame1 = reconciler.reconcile(
      View({
        children: [
          {
            type: "View",
            props: {},
            style: {},
            onUnmount: () => events.push("unmounted"),
          },
        ],
      })
    );
    const childId = frame1.children[0]!.stableId;

    store.setState({ stableId: childId, value: { n: 1 } });
    reconciler.reconcile(View({ children: [] }));

    expect(events).toEqual(["unmounted"]);
    // state was destroyed: a fresh stateFor returns the new initial
    expect(store.stateFor({ stableId: childId, initial: { fresh: true } })).toEqual({
      fresh: true,
    });
  });
});

// ————— StateStore —————

describe("StateStore", () => {
  test("stateFor is stable per stableId, lazy init runs once", () => {
    const store = new StateStore();
    let inits = 0;

    const a = store.stateFor({
      stableId: 7,
      initial: () => {
        inits++;
        return { count: 0 };
      },
    });
    const b = store.stateFor({
      stableId: 7,
      initial: () => {
        inits++;
        return { count: 9 };
      },
    });

    expect(b).toBe(a);
    expect(inits).toBe(1);
  });
});

// ————— full pipeline: reconcile → layout → paint (headless) —————

describe("pipeline", () => {
  test("tree → layout → paint ops in pre-order", () => {
    const idCounter = { value: 1 };
    const layoutCtx: LayoutContext = {
      layoutIndex: new Map<number, LayoutNode>(),
      focusableNodes: [],
      scrollOffsetOf: () => ({ x: 0, y: 0 }),
      getStableId: () => idCounter.value++,
      measureText: (text: string) => ({ width: text.length * 10, height: 20 }),
      getImageSize: () => null,
    };

    const tree = View({
      style: { width: 300, height: 200, flexDirection: FlexDirection.Row },
      children: [
        Label({ text: "hello", style: { backgroundColor: "#334455" } }),
        View({ style: { width: 100, height: 50, backgroundColor: "#cc8844" } }),
      ],
    });

    const recorded: Array<Record<string, unknown>> = [];
    const gpu = {
      fillRect: (o: RectOptions) => recorded.push({ op: "rect", ...o }),
      fillRoundedRect: (o: RectOptions & { radius: number }) =>
        recorded.push({ op: "rrect", ...o }),
      drawTexture: (o: TextureDrawOptions) => recorded.push({ op: "tex", ...o }),
    };
    const font = {
      draw: (_gpu: unknown, o: TextDrawOptions) => recorded.push({ op: "text", ...o }),
    };

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 300,
      availableHeight: 200,
      ctx: layoutCtx,
    });
    paintTree({ gpu, font }, root);

    // root has no background — ops are: label bg, label text, view bg
    expect(recorded.length).toBe(3);
    expect(recorded[0]).toMatchObject({ op: "rect", x: 0, y: 0, w: 50, h: 20 });
    expect(recorded[1]).toMatchObject({ op: "text", x: 0, y: 0 });
    expect(recorded[2]).toMatchObject({ op: "rect", x: 50, y: 0, w: 100, h: 50 });
  });
});
