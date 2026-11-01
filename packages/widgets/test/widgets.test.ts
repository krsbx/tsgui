import { AnimationManager } from "@tsgui/animation";
import { StateStore } from "@tsgui/core";
import type {
  ArcOptions,
  RectOptions,
  RingOptions,
  TextDrawOptions,
  TextureDrawOptions,
} from "@tsgui/gpu";
import { FlexDirection } from "@tsgui/layout";
import { layoutFlex } from "@tsgui/layout";
import type { LayoutContext, LayoutNode } from "@tsgui/layout";
import { colorWithOpacity, parseColor } from "@tsgui/paint";
import { paintTree } from "@tsgui/paint";
import { describe, expect, test } from "bun:test";
import {
  Label,
  Reconciler,
  renderHeadless,
  View,
  widgetPainters,
} from "../src/index.ts";

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
    expect(
      store.stateFor({ stableId: childId, initial: { fresh: true } })
    ).toEqual({
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
      drawTexture: (o: TextureDrawOptions) =>
        recorded.push({ op: "tex", ...o }),
      fillArc: (o: ArcOptions) => recorded.push({ op: "arc", ...o }),
      fillRing: (o: RingOptions) => recorded.push({ op: "ring", ...o }),
    };
    const font = {
      draw: (_gpu: unknown, o: TextDrawOptions) =>
        recorded.push({ op: "text", ...o }),
    };

    const root = layoutFlex({
      node: tree,
      x: 0,
      y: 0,
      availableWidth: 300,
      availableHeight: 200,
      ctx: layoutCtx,
    });
    paintTree({ gpu, font, painters: widgetPainters }, root);

    // root has no background — ops are: label bg, label text, view bg
    expect(recorded.length).toBe(3);
    expect(recorded[0]).toMatchObject({ op: "rect", x: 0, y: 0, w: 50, h: 20 });
    expect(recorded[1]).toMatchObject({ op: "text", x: 0, y: 0 });
    expect(recorded[2]).toMatchObject({
      op: "rect",
      x: 50,
      y: 0,
      w: 100,
      h: 50,
    });
  });
});

describe("label wrap paint", () => {
  test("wrapped label records one text op per line at the line advance", () => {
    // Harness stub: 8px per char, 18px line height. 60px holds 7 chars.
    const frame = renderHeadless(
      View({
        style: { width: 60, height: 60 },
        children: [Label({ text: "wrap me please" })],
      }),
      { width: 200, height: 200 }
    );

    const textOps = frame.ops.filter((op) => op.op === "text") as Array<{
      x: number;
      y: number;
      text: string;
    }>;

    expect(textOps.map((op) => op.text)).toEqual(["wrap me", "please"]);
    expect(textOps[1]!.y).toBe(textOps[0]!.y + 18);
  });

  test("fitting labels stay a single text op", () => {
    const frame = renderHeadless(
      View({
        style: { width: 200, height: 60 },
        children: [Label({ text: "wrap me please" })],
      }),
      { width: 400, height: 200 }
    );

    const textOps = frame.ops.filter((op) => op.op === "text");
    expect(textOps.length).toBe(1);
  });
});

describe("box shadow paint", () => {
  const shadow = { x: 0, y: 4, blur: 16, spread: 0, color: "#02061759" };

  test("layers stack evenly — concentric, faintest ramp, no dark halo", () => {
    // extent = blur/2 = 8; layers grow 8/6/4/2 around the offset rect.
    const frame = renderHeadless(
      View({
        style: { width: 100, height: 50, boxShadow: shadow },
      }),
      { width: 300, height: 300 }
    );

    const expected = colorWithOpacity(parseColor(shadow.color), 0.25);
    const layers = frame.ops.filter(
      (op) => op.op === "rrect" && (op as { color: number }).color === expected
    ) as Array<{ x: number; y: number; w: number; h: number; radius: number }>;

    expect(layers.length).toBe(4);

    // Outermost first, each strictly smaller.
    const widths = layers.map((op) => op.w);
    expect(widths).toEqual([...widths].sort((a, b) => b - a));

    // Even space on both sides of each axis: every layer stays centered
    // on the offset rect (cx = 50; cy = 25 + offsetY 4) — the "shadow
    // takes a different amount of space per side" regression.
    for (const op of layers) {
      expect(op.x + op.w / 2).toBe(50);
      expect(op.y + op.h / 2).toBe(29);
    }

    // The reach matches blur/2: the widest layer extends 8px per side.
    expect(widths[0]).toBe(100 + 2 * 8);
  });

  test("no shadow, no shadow ops", () => {
    const frame = renderHeadless(View({ style: { width: 40, height: 40 } }), {
      width: 100,
      height: 100,
    });
    const expected = colorWithOpacity(parseColor("#02061759"), 0.25);
    expect(
      frame.ops.filter(
        (op) =>
          op.op === "rrect" && (op as { color: number }).color === expected
      ).length
    ).toBe(0);
  });
});

describe("transition overlay", () => {
  const idCounter = { value: 1 };
  const layoutCtx: LayoutContext = {
    layoutIndex: new Map<number, LayoutNode>(),
    focusableNodes: [],
    scrollOffsetOf: () => ({ x: 0, y: 0 }),
    getStableId: () => idCounter.value++,
    measureText: (text: string) => ({ width: text.length * 10, height: 20 }),
    getImageSize: () => null,
  };

  test("a transitioning background animates between old and new", () => {
    const animations = new AnimationManager();
    const recorded: Array<Record<string, unknown>> = [];
    const gpu = {
      fillRect: (o: RectOptions) => recorded.push({ op: "rect", ...o }),
      fillRoundedRect: (o: RectOptions & { radius: number }) =>
        recorded.push({ op: "rrect", ...o }),
      drawTexture: () => {},
      fillArc: () => {},
      fillRing: () => {},
    };
    const font = { draw: () => {} };

    const box = View({
      style: {
        width: 100,
        height: 50,
        backgroundColor: "#000000",
        transition: { duration: 100 },
      },
    });
    const root = layoutFlex({
      node: box,
      x: 0,
      y: 0,
      availableWidth: 100,
      availableHeight: 50,
      ctx: layoutCtx,
    });
    const ctx = {
      gpu,
      font,
      painters: widgetPainters,
      animationManager: animations,
    };

    const backgroundOf = (): number => {
      recorded.length = 0;
      paintTree(ctx, root);
      const bg = recorded.find(
        (op) =>
          (op.op === "rect" || op.op === "rrect") && op.w === 100 && op.h === 50
      ) as { color: number };
      return bg.color;
    };

    // Frame 1 — first sighting snaps to the initial color.
    animations.tick(1000);
    expect(backgroundOf()).toBe(parseColor("#000000"));

    // The style retargets; the change registers on the frame it appears
    // (first paint after a change still shows the old color, like CSS),
    // then mid-flight the paint lands between the two.
    box.style!.backgroundColor = "#ffffff";
    animations.tick(1050);
    expect(backgroundOf()).toBe(parseColor("#000000"));

    animations.tick(1100);
    const mid = backgroundOf();
    expect(mid).not.toBe(parseColor("#000000"));
    expect(mid).not.toBe(parseColor("#ffffff"));

    // Long after the duration the overlay settles: the first frame after
    // the gap re-anchors from the displayed value (the resumed tail),
    // the next lands the parsed-exact white, then the overlay stops and
    // the resolved style passes through untouched.
    animations.tick(2100);
    backgroundOf(); // resumed tail re-anchors from the displayed value
    animations.tick(2200);
    expect(backgroundOf()).toBe(parseColor("#ffffff"));
    animations.tick(2300);
    expect(backgroundOf()).toBe(parseColor("#ffffff"));
  });
});
