/**
 * RangeSlider — paint structure and the two-handle drag contract through
 * the real dispatcher: nearest-handle picking with the low tie-break,
 * track-press jumps, no-cross clamping (handles meet, never swap),
 * hover never mutates, step snapping, disabled no-op, release ends drag.
 */
import {
  MouseButton,
  Palette,
  type ReconcilableWidget,
  StateStore,
} from "@vulcania/core";
import { PointerDispatcher, PointerInputKind } from "@vulcania/interactions";
import {
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  ProgressBarOrientation,
} from "@vulcania/layout";
import { parseColor } from "@vulcania/paint";
import { describe, expect, test } from "bun:test";
import {
  type PaintOp,
  PaintOpKind,
  RangeSlider,
  Reconciler,
  renderHeadless,
} from "../src/index.ts";

const WIDTH = 200;
const HEIGHT = 24;
const MIN = 0;
const MAX = 100;
/** Handle-top x for a value in a 200-wide horizontal slider at x=0. */
const handleX = (value: number): number => (value / (MAX - MIN)) * (WIDTH - 16);

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

function setup(widget: ReconcilableWidget): Harness {
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
      // AppWindow passes the store — activeHandle rides it across
      // rebuilds, so the harness must too.
      dispatcher.dispatch({ events, root, layoutIndex, stateStore });
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

/** Closed-loop controlled range: onChange commits + re-renders. */
function rangeHarness(
  initial: [number, number],
  step?: number
): {
  h: Harness;
  value: () => [number, number];
  widget: () => ReconcilableWidget;
} {
  let current: [number, number] = initial;
  const widget = (): ReconcilableWidget =>
    RangeSlider({
      value: current,
      min: MIN,
      max: MAX,
      ...(step !== undefined ? { step } : {}),
      style: { width: WIDTH, height: HEIGHT },
      onChange: (next) => {
        current = next;
      },
    });
  const h = setup(widget());
  return {
    h,
    value: () => current,
    widget,
  };
}

describe("RangeSlider paint", () => {
  test("track → fill between handle centers → two handles", () => {
    const frame = renderHeadless(
      RangeSlider({
        value: [25, 75],
        min: MIN,
        max: MAX,
        style: { width: WIDTH, height: HEIGHT },
      }),
      { width: 400, height: 300 }
    );

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
    // Track + fill + two handle rings + two handle surfaces = 6.
    expect(fills.length).toBe(6);

    const lowX = handleX(25); // 46
    const highX = handleX(75); // 138
    expect(fills[0]).toMatchObject({
      x: 0,
      y: 10,
      w: WIDTH,
      h: 4,
      color: parseColor(Palette.surfaceActive),
    });
    // Fill spans between the handle centers (46+8 → 138+8 wide ends at
    // 138+46=... center-to-center: from low center to high center).
    expect(fills[1]).toMatchObject({
      x: lowX + 8,
      y: 10,
      w: highX - lowX,
      h: 4,
    });
    // Low handle ring + surface.
    expect(fills[2]).toMatchObject({ x: lowX - 0.5, y: 3.5, w: 17, h: 17 });
    expect(fills[3]).toMatchObject({ x: lowX, y: 4, w: 16, h: 16 });
    // High handle ring + surface.
    expect(fills[4]).toMatchObject({ x: highX - 0.5, y: 3.5, w: 17, h: 17 });
    expect(fills[5]).toMatchObject({ x: highX, y: 4, w: 16, h: 16 });
  });

  test("zero-width range paints no fill", () => {
    const frame = renderHeadless(
      RangeSlider({
        value: [50, 50],
        min: MIN,
        max: MAX,
        style: { width: WIDTH, height: HEIGHT },
      }),
      { width: 400, height: 300 }
    );
    const fills = frame.ops.filter((op) => {
      const solid =
        op.op === PaintOpKind.Rect || op.op === PaintOpKind.RoundedRect;
      const colored = (op as { color: number }).color !== 0;
      return solid && colored && (op as { w: number }).w > 0;
    });
    // Track + 2 rings + 2 surfaces, no fill (0 width skipped).
    expect(fills.length).toBe(5);
  });
});

describe("RangeSlider drag", () => {
  test("hover moves never change the range", () => {
    const { h, value } = rangeHarness([25, 75]);
    h.fire([ev(PointerInputKind.Move, 170, 12)]);
    expect(value()).toEqual([25, 75]);
  });

  test("track press picks the nearest handle and jumps it", () => {
    const { h, value, widget } = rangeHarness([25, 75]);

    // x=170 is past the high handle (ends at 154) — nearest handle is
    // high, and the track press jumps it to the pointer.
    h.fire([ev(PointerInputKind.Down, 170, 12)]);
    h.render(widget());
    const [low, high] = value();
    expect(low).toBe(25);
    // raw at x=170: ratio (170-8)/184 → 88.04.
    expect(high).toBeGreaterThan(75);
    expect(high).toBeCloseTo(((170 - 8) * (MAX - MIN)) / (WIDTH - 16), 1);
  });

  test("low dragged to high clamps — handles meet, never cross", () => {
    const { h, value, widget } = rangeHarness([25, 75]);

    h.fire([ev(PointerInputKind.Down, handleX(25) + 8, 12)]);
    h.fire([ev(PointerInputKind.Move, 500, 12)]);
    h.render(widget());
    const [low, high] = value();
    expect(low).toBe(75);
    expect(high).toBe(75);
  });

  test("coincident handles: press grabs low — low moves, high stays", () => {
    const { h, value, widget } = rangeHarness([75, 75]);

    // Press exactly on the shared handle position, drag left.
    h.fire([ev(PointerInputKind.Down, handleX(75) + 8, 12)]);
    h.fire([ev(PointerInputKind.Move, handleX(20), 12)]);
    h.render(widget());
    const [low, high] = value();
    expect(low).toBeLessThan(75);
    expect(high).toBe(75);
  });

  test("high dragged below low clamps up to low", () => {
    const { h, value, widget } = rangeHarness([40, 60]);

    h.fire([ev(PointerInputKind.Down, handleX(60) + 8, 12)]);
    h.fire([ev(PointerInputKind.Move, 0, 12)]);
    h.render(widget());
    expect(value()).toEqual([40, 40]);
  });

  test("release ends the drag — later moves don't mutate", () => {
    const { h, value, widget } = rangeHarness([25, 75]);

    h.fire([ev(PointerInputKind.Down, handleX(25) + 8, 12)]);
    h.fire([ev(PointerInputKind.Move, handleX(30) + 8, 12)]);
    h.render(widget());
    const afterDrag = value();
    expect(afterDrag[0]).toBeGreaterThan(25);

    h.fire([ev(PointerInputKind.Up, handleX(30) + 8, 12)]);
    h.fire([ev(PointerInputKind.Move, 0, 12)]);
    h.render(widget());
    expect(value()).toBe(afterDrag);
  });

  test("drag survives a mid-drag rebuild — activeHandle rides the store", () => {
    // Every controlled change rebuilds the descriptor; the fresh drag
    // closure must not forget which handle is grabbed (the freeze bug
    // that made RangeSlider feel unresponsive next to SliderBar).
    const { h, value, widget } = rangeHarness([25, 75]);

    h.fire([ev(PointerInputKind.Down, handleX(25) + 8, 12)]);
    h.fire([ev(PointerInputKind.Move, handleX(30) + 8, 12)]);
    h.render(widget()); // the onChange rebuild — closure state is gone

    h.fire([ev(PointerInputKind.Move, handleX(40) + 8, 12)]);
    h.render(widget());
    const [low, high] = value();
    expect(low).toBeCloseTo(40, 1);
    expect(high).toBe(75);
  });

  test("step snapping — every payload lands on the grid", () => {
    const seen: Array<[number, number]> = [];
    let current: [number, number] = [0, 75];
    const widget = (): ReconcilableWidget =>
      RangeSlider({
        value: current,
        min: MIN,
        max: MAX,
        step: 25,
        style: { width: WIDTH, height: HEIGHT },
        onChange: (next) => {
          current = next;
          seen.push(next);
        },
      });
    const h = setup(widget());

    h.fire([ev(PointerInputKind.Down, handleX(0) + 8, 12)]);
    for (let x = 20; x <= 180; x += 10)
      h.fire([ev(PointerInputKind.Move, x, 12)]);

    expect(seen.length).toBeGreaterThan(0);
    for (const [low, high] of seen) {
      expect(low % 25).toBe(0);
      expect(high % 25).toBe(0);
    }
  });

  test("disabled slider ignores everything", () => {
    let current: [number, number] = [25, 75];
    const widget = (): ReconcilableWidget =>
      RangeSlider({
        value: current,
        min: MIN,
        max: MAX,
        disabled: true,
        style: { width: WIDTH, height: HEIGHT },
        onChange: (next) => {
          current = next;
        },
      });
    const h = setup(widget());

    h.fire([
      ev(PointerInputKind.Down, 150, 12),
      ev(PointerInputKind.Move, 0, 12),
      ev(PointerInputKind.Up, 0, 12),
    ]);
    expect(current).toEqual([25, 75]);
  });

  test("vertical: top is max — a press near the top jumps high", () => {
    let current: [number, number] = [25, 75];
    const widget = (): ReconcilableWidget =>
      RangeSlider({
        value: current,
        min: MIN,
        max: MAX,
        orientation: ProgressBarOrientation.Vertical,
        style: { width: HEIGHT, height: WIDTH },
        onChange: (next) => {
          current = next;
        },
      });
    const h = setup(widget());

    // Vertical 24×200 at 0,0. Press near the top (high region, above
    // both handles): nearest handle wins, jumps toward max.
    h.fire([ev(PointerInputKind.Down, 12, 5)]);
    expect(current[1]).toBeGreaterThan(75);
    expect(current[0]).toBe(25);
  });
});
