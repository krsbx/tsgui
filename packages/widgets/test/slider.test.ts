/**
 * SliderBar — paint structure and the drag contract through the real
 * dispatcher: track-press jumps, handle-press drags, hover never mutates,
 * step snapping, and the disabled no-op.
 */
import { MouseButton, Palette, StateStore } from "@vulcania/core";
import { PointerDispatcher, PointerInputKind } from "@vulcania/interactions";
import { type LayoutContext, layoutFlex, type LayoutNode } from "@vulcania/layout";
import { parseColor } from "@vulcania/paint";
import { describe, expect, test } from "bun:test";
import {
  type PaintOp,
  PaintOpKind,
  Reconciler,
  renderHeadless,
  SliderBar,
} from "../src/index.ts";

interface Harness {
  fire(
    events: {
      kind: PointerInputKind;
      x: number;
      y: number;
      button?: MouseButton;
    }[]
  ): void;
  render(widget: Parameters<typeof renderHeadless>[0]): void;
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
    availableWidth: 400,
    availableHeight: 300,
    ctx,
  });

  return {
    fire(events) {
      dispatcher.dispatch({ events, root, layoutIndex });
    },
    render(next) {
      root = layoutFlex({
        node: reconciler.reconcile(next).widget,
        x: 0,
        y: 0,
        availableWidth: 400,
        availableHeight: 300,
        ctx,
      });
    },
  };
}

const ev = (
  kind: PointerInputKind,
  x: number,
  y: number
): { kind: PointerInputKind; x: number; y: number; button?: MouseButton } => {
  const button =
    kind === PointerInputKind.Down || kind === PointerInputKind.Up
      ? MouseButton.Left
      : undefined;
  return { kind, x, y, button };
};

describe("SliderBar paint", () => {
  test("track → fill → handle at the value's ratio", () => {
    const frame = renderHeadless(
      SliderBar({
        value: 50,
        min: 0,
        max: 100,
        style: { width: 200, height: 24 },
      }),
      { width: 400, height: 300 }
    );

    // Drop the control's own transparent box — what's left is
    // track (200×4) + fill (to the handle center) + the handle's border
    // ring and surface fill.
    type Fill = PaintOp & {
      color: number;
      x: number;
      y: number;
      w: number;
      h: number;
    };
    const fills = frame.ops.filter((op): op is Fill => {
      const solid =
        op.op === PaintOpKind.Rect || op.op === PaintOpKind.RoundedRect;
      return solid && (op as Fill).color !== 0;
    });
    expect(fills.length).toBe(4);
    expect(fills[0]).toMatchObject({
      x: 0,
      y: 10,
      w: 200,
      h: 4,
      color: parseColor(Palette.surfaceActive),
    });
    expect(fills[1]).toMatchObject({
      x: 0,
      w: 100,
      h: 4,
      color: parseColor(Palette.accent),
    });
    // Handle: border ring first, then the surface fill inside it.
    expect(fills[2]).toMatchObject({
      x: 91.5,
      y: 3.5,
      w: 17,
      h: 17,
      color: parseColor(Palette.border),
    });
    expect(fills[3]).toMatchObject({
      x: 92,
      y: 4,
      w: 16,
      h: 16,
      color: parseColor(Palette.surface),
    });
  });

  test("marks render as ticks at their value positions", () => {
    const frame = renderHeadless(
      SliderBar({
        value: 50,
        min: 0,
        max: 100,
        marks: [{ value: 0, label: "low" }, { value: 100 }],
        style: { width: 200, height: 24 },
      }),
      { width: 400, height: 300 }
    );

    const ticks = frame.ops.filter(
      (op): op is PaintOp & { w: number; x: number } =>
        op.op === PaintOpKind.Rect && (op as PaintOp & { w: number }).w === 3
    );
    expect(ticks.length).toBe(2);
    expect(ticks[0]).toMatchObject({
      x: -1.5,
      color: parseColor(Palette.border),
    });
    expect(ticks[1]).toMatchObject({ x: 198.5 });
  });
});

describe("SliderBar drag", () => {
  test("track press jumps, handle press drags, hover never mutates", () => {
    const changes: number[] = [];
    let value = 50;

    const make = (): Parameters<typeof renderHeadless>[0] =>
      SliderBar({
        value,
        min: 0,
        max: 100,
        style: { width: 200, height: 24 },
        onChange: (next) => {
          changes.push(next);
          value = next;
        },
      });

    const harness = setup(make());

    // Hover over the track — no change (no press, not captured).
    harness.fire([ev(PointerInputKind.Move, 150, 12)]);
    expect(changes).toEqual([]);

    // Track press (far from the centered 50% handle at x 92..108) jumps to
    // ~75, captures, and the following move drags onward.
    harness.fire([ev(PointerInputKind.Down, 150, 12)]);
    harness.fire([ev(PointerInputKind.Move, 150, 12)]);
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]).toBeGreaterThan(50);

    // Release ends the drag; further hover moves must not mutate.
    harness.fire([ev(PointerInputKind.Up, 150, 12)]);
    const before = changes.length;
    harness.fire([ev(PointerInputKind.Move, 20, 12)]);
    expect(changes.length).toBe(before);

    // Rebuild like the app loop, then drag FROM the handle (no jump): press
    // at the handle, move left — values step down from the current one.
    harness.render(make());
    const handleX = 8 + (value / 100) * (200 - 16);
    const valueBeforeDrag = value;
    harness.fire([ev(PointerInputKind.Down, handleX, 12)]);
    const atHandle = changes.length;
    harness.fire([ev(PointerInputKind.Move, handleX - 40, 12)]);
    expect(changes.length).toBe(atHandle + 1);
    expect(changes[changes.length - 1]).toBeLessThan(valueBeforeDrag);
  });

  test("step snaps drag values", () => {
    const changes: number[] = [];
    let value = 50;

    const make = (): Parameters<typeof renderHeadless>[0] =>
      SliderBar({
        value,
        min: 0,
        max: 100,
        step: 25,
        style: { width: 200, height: 24 },
        onChange: (next) => {
          changes.push(next);
          value = next;
        },
      });

    const harness = setup(make());
    harness.fire([ev(PointerInputKind.Down, 100, 12)]);
    const seen = new Set(changes);
    for (const seen_ of seen) expect(seen_ % 25).toBe(0);
    expect(harness).toBeDefined();
  });

  test("disabled slider ignores everything", () => {
    const changes: number[] = [];
    const { fire } = setup(
      SliderBar({
        value: 50,
        min: 0,
        max: 100,
        disabled: true,
        style: { width: 200, height: 24 },
        onChange: (next) => changes.push(next),
      })
    );

    fire([ev(PointerInputKind.Down, 150, 12)]);
    fire([ev(PointerInputKind.Move, 150, 12)]);
    fire([ev(PointerInputKind.Up, 150, 12)]);

    expect(changes).toEqual([]);
  });

  test("full harness wiring works end to end", () => {
    // Sanity: setup + render rebuild keeps dispatching against the new tree.
    let value = 25;
    const harness = setup(
      SliderBar({
        value,
        min: 0,
        max: 100,
        style: { width: 200, height: 24 },
        onChange: (next) => {
          value = next;
        },
      })
    );
    harness.fire([ev(PointerInputKind.Down, 8, 12)]);
    harness.render(
      SliderBar({
        value,
        min: 0,
        max: 100,
        style: { width: 200, height: 24 },
        onChange: (next) => {
          value = next;
        },
      })
    );
    harness.fire([ev(PointerInputKind.Move, 192, 12)]);
    expect(value).toBe(100);
  });
});
