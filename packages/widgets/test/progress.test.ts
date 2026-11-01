/**
 * Progress + meter semantics through the headless harness — fill geometry,
 * direction, steps, color stops, zones, and the arc primitives' ops.
 */
import { AnimationManager } from "@tsgui/animation";
import { type ColorStop, MeterZone } from "@tsgui/core";
import { valueToRatio } from "@tsgui/layout";
import { ProgressType } from "@tsgui/layout";
import { parseColor, resolveFillColorClamped } from "@tsgui/paint";
import { describe, expect, test } from "bun:test";
import {
  CircularProgress,
  formatValueLabel,
  Meter,
  ProgressBar,
  renderHeadless,
  resolveMeterColor,
} from "../src/index.ts";
import { Palette } from "../src/index.ts";

const ACCENT = parseColor(Palette.accent);
const TRACK = parseColor(Palette.surfaceActive);

const rectOps = (ops: ReturnType<typeof renderHeadless>["ops"]) =>
  ops.filter((op) => op.op === "rect");

describe("value + color helpers", () => {
  test("valueToRatio clamps to [0, 1]", () => {
    expect(valueToRatio({ value: 50, min: 0, max: 100 })).toBe(0.5);
    expect(valueToRatio({ value: -10, min: 0, max: 100 })).toBe(0);
    expect(valueToRatio({ value: 200, min: 0, max: 100 })).toBe(1);
    expect(valueToRatio({ value: 5, min: 5, max: 5 })).toBe(0); // zero span
  });

  test("formatValueLabel: explicit label wins, percent computed from range", () => {
    expect(
      formatValueLabel({ format: "percent", value: 0.25, min: 0, max: 1 })
    ).toBe("25%");
    expect(
      formatValueLabel({ format: "value", value: 7, min: 0, max: 10 })
    ).toBe("7/10");
    expect(
      formatValueLabel({ format: "percent", value: undefined })
    ).toBeNull();
  });

  test("color stops: highest stop at or below the ratio wins", () => {
    const stops: ColorStop[] = [
      { at: 0, color: "#ef4444" },
      { at: 0.5, color: "#eab308" },
      { at: 0.75, color: "#22c55e" },
    ];
    expect(resolveFillColorClamped({ ratio: 0.8, colorStops: stops })).toBe(
      "#22c55e"
    );
    expect(resolveFillColorClamped({ ratio: 0.5, colorStops: stops })).toBe(
      "#eab308"
    );
    expect(resolveFillColorClamped({ ratio: 0.2, colorStops: stops })).toBe(
      "#ef4444"
    );
    expect(resolveFillColorClamped({ ratio: 1.4, colorStops: stops })).toBe(
      "#22c55e"
    );
  });

  test("meter zones follow the optimum's position", () => {
    // Optimum in the low zone: low is good.
    expect(
      resolveMeterColor({ value: 5, low: 30, high: 60, optimum: 10 })
    ).toBe(MeterZone.Success);
    expect(
      resolveMeterColor({ value: 45, low: 30, high: 60, optimum: 10 })
    ).toBe(MeterZone.Warning);
    expect(
      resolveMeterColor({ value: 90, low: 30, high: 60, optimum: 10 })
    ).toBe(MeterZone.Error);
    // Optimum mid: medium is good.
    expect(
      resolveMeterColor({ value: 45, low: 30, high: 60, optimum: 45 })
    ).toBe(MeterZone.Success);
    expect(
      resolveMeterColor({ value: 90, low: 30, high: 60, optimum: 45 })
    ).toBe(MeterZone.Warning);
    // Optimum high: high is good.
    expect(
      resolveMeterColor({ value: 90, low: 30, high: 60, optimum: 90 })
    ).toBe(MeterZone.Success);
  });
});

describe("ProgressBar ops", () => {
  test("determinate fill is a ratio-sized sub-rect of the track", () => {
    const frame = renderHeadless(
      ProgressBar({
        value: 25,
        min: 0,
        max: 100,
        style: { width: 100, height: 4 },
      }),
      { width: 200, height: 50 }
    );

    expect(rectOps(frame.ops)).toEqual([
      { op: "rect", x: 0, y: 0, w: 100, h: 4, color: TRACK },
      { op: "rect", x: 0, y: 0, w: 25, h: 4, color: ACCENT },
    ]);
  });

  test("backward direction fills from the far edge", () => {
    const frame = renderHeadless(
      ProgressBar({
        value: 25,
        min: 0,
        max: 100,
        direction: "backward",
        style: { width: 100, height: 4 },
      }),
      { width: 200, height: 50 }
    );

    expect(rectOps(frame.ops)[1]).toMatchObject({ x: 75, w: 25 });
  });

  test("buffer renders behind the main fill at reduced opacity", () => {
    const frame = renderHeadless(
      ProgressBar({
        value: 25,
        buffer: 50,
        min: 0,
        max: 100,
        style: { width: 100, height: 4 },
      }),
      { width: 200, height: 50 }
    );

    const fills = rectOps(frame.ops);
    expect(fills.length).toBe(3);
    const buffer = fills[1] as { w: number; color: number };
    const main = fills[2] as { w: number; color: number };
    expect(buffer.w).toBe(50);
    expect(main.w).toBe(25);
    // Buffer alpha = 0.35 × 255 ≈ 89.
    expect((buffer.color >>> 24) & 255).toBeLessThan(100);
  });

  test("stepped mode fills whole segments with gaps", () => {
    const frame = renderHeadless(
      ProgressBar({
        value: 40,
        min: 0,
        max: 100,
        steps: 5,
        stepGap: 2,
        style: { width: 100, height: 4 },
      }),
      { width: 200, height: 50 }
    );

    const fills = rectOps(frame.ops);
    expect(fills.length).toBe(3); // track + 2 filled segments
    expect((fills[1] as { w: number }).w).toBeCloseTo((100 - 8) / 5, 5);
  });

  test("colorStops override the fill color by ratio", () => {
    const frame = renderHeadless(
      ProgressBar({
        value: 80,
        min: 0,
        max: 100,
        colorStops: [
          { at: 0, color: "#ef4444" },
          { at: 0.75, color: "#22c55e" },
        ],
        style: { width: 100, height: 4 },
      }),
      { width: 200, height: 50 }
    );

    expect(rectOps(frame.ops)[1]).toMatchObject({
      color: parseColor("#22c55e"),
    });
  });
});

describe("CircularProgress ops", () => {
  test("determinate ring sweeps clockwise from the top", () => {
    const frame = renderHeadless(
      CircularProgress({ value: 50, min: 0, max: 100 }),
      {
        width: 100,
        height: 100,
      }
    );

    const ring = frame.ops.find((op) => op.op === "ring") as {
      cx: number;
      cy: number;
      radius: number;
      innerRadius: number;
      startAngle: number;
      endAngle: number;
    };
    expect(ring).toBeDefined();
    expect(ring.cx).toBeCloseTo(24);
    expect(ring.cy).toBeCloseTo(24);
    expect(ring.radius).toBeCloseTo(24);
    expect(ring.innerRadius).toBeCloseTo(24 * 0.9);
    expect(ring.startAngle).toBeCloseTo(-Math.PI / 2);
    expect(ring.endAngle).toBeCloseTo(-Math.PI / 2 + Math.PI); // half sweep
  });

  test("thickness >= 1 renders a pie via fillArc", () => {
    const frame = renderHeadless(
      CircularProgress({ value: 50, min: 0, max: 100, thickness: 1 }),
      { width: 100, height: 100 }
    );

    expect(frame.ops.find((op) => op.op === "arc")).toBeDefined();
    expect(frame.ops.find((op) => op.op === "ring")).toBeUndefined();
  });

  test("counter-clockwise sweeps negatively", () => {
    const frame = renderHeadless(
      CircularProgress({
        value: 25,
        min: 0,
        max: 100,
        direction: "counterclockwise",
      }),
      { width: 100, height: 100 }
    );

    const ring = frame.ops.find((op) => op.op === "ring") as {
      startAngle: number;
      endAngle: number;
    };
    expect(ring.endAngle).toBeLessThan(ring.startAngle);
  });
});

describe("Meter ops", () => {
  test("fill color resolves through the zone palette", () => {
    const frame = renderHeadless(
      Meter({ value: 90, style: { width: 100, height: 8 } }),
      { width: 200, height: 50 }
    );

    // Defaults: low 33.3, high 66.7, optimum mid → 90 is in the high zone.
    expect(rectOps(frame.ops)[1]).toMatchObject({
      color: parseColor(Palette.warning),
    });
  });
});

describe("indeterminate motion", () => {
  const barAt = (time: number) => {
    const animations = new AnimationManager();
    animations.tick(time);
    return renderHeadless(
      ProgressBar({
        type: ProgressType.Indeterminate,
        style: { width: 200, height: 8 },
      }),
      { width: 200, height: 8, animationManager: animations }
    );
  };

  const segmentOf = (frame: ReturnType<typeof renderHeadless>) =>
    frame.ops.find(
      (op) =>
        (op.op === "rect" || op.op === "rrect") && (op as { w: number }).w < 200
    ) as { x: number; w: number } | undefined;

  test("the bar segment travels with the manager clock", () => {
    // t=200: cycle 0.133, ease-in-out → 0.0356 of the 280px travel —
    // the 80px segment is still entering: visible at x=0, ~10px wide.
    const entering = segmentOf(barAt(200));
    expect(entering?.x).toBe(0);
    expect(entering?.w).toBeCloseTo(10, 0);

    // t=750: cycle 0.5 → ease-in-out 0.5 → the segment centers: 60..140
    // of the 200px track.
    const mid = segmentOf(barAt(750));
    expect(mid?.x).toBeCloseTo(60, 0);
    expect(mid?.w).toBeCloseTo(80, 0);
  });

  test("without a manager the bar paints the static mid-cycle segment", () => {
    const frame = renderHeadless(
      ProgressBar({
        type: ProgressType.Indeterminate,
        style: { width: 200, height: 8 },
      }),
      { width: 200, height: 8 }
    );
    // Manager absent → time defaults to 750 (mid-cycle) — a real phase,
    // not the old frozen third.
    const seg = segmentOf(frame);
    expect(seg?.x).toBeCloseTo(60, 0);
  });

  test("the circular arc sweeps with the manager clock", () => {
    const animations = new AnimationManager();
    animations.tick(500); // cycle 0.25 → arcStart = -π/2 + π/2 = 0
    const frame = renderHeadless(
      CircularProgress({
        type: ProgressType.Indeterminate,
        style: { width: 40, height: 40 },
      }),
      { width: 40, height: 40, animationManager: animations }
    );

    const ring = frame.ops.find((op) => op.op === "ring") as
      { startAngle: number; endAngle: number } | undefined;
    expect(ring).toBeDefined();
    expect(ring!.startAngle).toBeCloseTo(0, 5);
    expect(ring!.endAngle).toBeCloseTo(Math.PI * 1.5, 5);
  });
});
