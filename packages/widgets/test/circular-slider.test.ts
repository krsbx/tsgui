/**
 * CircularSlider — paint structure and angle-drag semantics through the
 * real dispatcher: track-press jumps to the angle's value, handle-dot
 * press drags, hover never mutates.
 */
import { type LayoutContext, layoutFlex, type LayoutNode } from "@tsgui/layout";
import { describe, expect, test } from "bun:test";
import {
  CircularSlider,
  MouseButton,
  type PaintOp,
  PaintOpKind,
  parseColor,
  PointerDispatcher,
  PointerInputKind,
  Reconciler,
  renderHeadless,
  StateStore,
} from "../src/index.ts";
import { Palette } from "../src/index.ts";

interface Harness {
  fire(kind: PointerInputKind, x: number, y: number): void;
  render(widget: Parameters<typeof renderHeadless>[0]): void;
  root(): LayoutNode;
}

function setup(widget: Parameters<typeof renderHeadless>[0]): Harness {
  const stateStore = new StateStore();
  const reconciler = new Reconciler(stateStore);
  const dispatcher = new PointerDispatcher();

  const layoutIndex = new Map<number, LayoutNode>();
  const ctx: LayoutContext = {
    layoutIndex,
    focusableNodes: [],
    scrollOffsetOf: () => ({ x: 0, y: 0 }),
    getStableId: reconciler.getStableId,
    measureText: (text) => ({ width: text.length * 8, height: 18 }),
    getImageSize: () => null,
  };

  let root = layoutFlex({
    node: reconciler.reconcile(widget).widget,
    x: 0,
    y: 0,
    availableWidth: 200,
    availableHeight: 200,
    ctx,
  });

  return {
    fire(kind, x, y) {
      const button =
        kind === PointerInputKind.Down || kind === PointerInputKind.Up
          ? MouseButton.Left
          : undefined;
      dispatcher.dispatch({
        events: [{ kind, x, y, button }],
        root,
        layoutIndex,
      });
    },
    render(next) {
      root = layoutFlex({
        node: reconciler.reconcile(next).widget,
        x: 0,
        y: 0,
        availableWidth: 200,
        availableHeight: 200,
        ctx,
      });
    },
    root: () => root,
  };
}

// A 48px slider at (0,0): center (24,24), radius 24, ring thickness 0.15
// → mid radius ≈ 22.2. Points sampled on the mid radius circle.

describe("CircularSlider paint", () => {
  test("track ring + filled arc to the handle angle", () => {
    const frame = renderHeadless(
      CircularSlider({ value: 25, min: 0, max: 100, size: 48 }),
      { width: 200, height: 200 }
    );

    const rings = frame.ops.filter((op) => op.op === "ring");
    expect(rings.length).toBe(2);
    // Track: full sweep from the top.
    expect(rings[0]).toMatchObject({
      cx: 24,
      cy: 24,
      radius: 24,
      innerRadius: 24 * 0.85,
      startAngle: -Math.PI / 2,
      endAngle: -Math.PI / 2 + Math.PI * 2,
      color: parseColor(Palette.surfaceActive),
    });
    // Fill: quarter sweep — start to the 25% handle angle.
    expect(rings[1]).toMatchObject({
      cx: 24,
      cy: 24,
      endAngle: -Math.PI / 2 + Math.PI / 2,
      color: parseColor(Palette.accent),
    });
  });

  test("handle dot rides the mid radius at the value's angle", () => {
    const frame = renderHeadless(
      CircularSlider({ value: 25, min: 0, max: 100, size: 48 }),
      { width: 200, height: 200 }
    );

    // 25% clockwise from the top = right side; mid radius ≈ 22.2.
    const dots = frame.ops.filter(
      (op): op is PaintOp & { w: number; x: number; y: number } =>
        op.op === PaintOpKind.RoundedRect &&
        (op as PaintOp & { w: number }).w === 16
    );
    expect(dots.length).toBe(1);
    const expectedCenter = 24 + Math.cos(-Math.PI / 2 + Math.PI / 2) * 22.2;
    expect(dots[0]!.x + 8).toBeCloseTo(expectedCenter, 1);
    expect(dots[0]!.y + 8).toBeCloseTo(24, 1);
  });
});

describe("CircularSlider drag", () => {
  test("track press jumps to the angle, handle press drags", () => {
    const changes: number[] = [];
    let value = 25;
    const make = (): Parameters<typeof renderHeadless>[0] =>
      CircularSlider({
        value,
        min: 0,
        max: 100,
        size: 48,
        onChange: (next) => {
          changes.push(next);
          value = next;
        },
      });

    const harness = setup(make());

    // Press straight DOWN from center (bottom = 50%) — track jump.
    harness.fire(PointerInputKind.Down, 24, 47);
    expect(changes).toEqual([50]);

    // Captured drag to the right side (quarter) — 25.
    harness.fire(PointerInputKind.Move, 47, 24);
    expect(changes).toEqual([50, 25]);

    // Release ends the drag; hover moves must not mutate.
    harness.fire(PointerInputKind.Up, 47, 24);
    harness.fire(PointerInputKind.Move, 10, 24);
    expect(changes).toEqual([50, 25]);

    // App rebuilds; drag from the (now right-side) handle further down —
    // bottom is 50 again... value is 25, handle at the right; press ON the
    // handle must NOT jump, only the move applies.
    harness.render(make());
    const before = changes.length;
    const hx = 24 + Math.cos(-Math.PI / 2 + Math.PI * 2 * (value / 100)) * 22.2;
    const hy = 24 + Math.sin(-Math.PI / 2 + Math.PI * 2 * (value / 100)) * 22.2;
    harness.fire(PointerInputKind.Down, hx, hy);
    expect(changes.length).toBe(before);
    harness.fire(PointerInputKind.Move, 24, 47);
    expect(changes.length).toBe(before + 1);
    expect(changes[changes.length - 1]).toBe(50);
  });

  test("counter-clockwise direction inverts the mapping", () => {
    const changes: number[] = [];
    const { fire } = setup(
      CircularSlider({
        value: 25,
        min: 0,
        max: 100,
        direction: "counterclockwise",
        size: 48,
        onChange: (next) => changes.push(next),
      })
    );

    // CCW: the bottom of the circle is a half sweep from the top.
    // (The 25% handle itself sits on the LEFT for counter-clockwise.)
    fire(PointerInputKind.Down, 24, 47);
    expect(changes).toEqual([50]);
  });
});
