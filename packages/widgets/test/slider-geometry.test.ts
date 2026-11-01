/** Slider geometry — position↔value math and handle hit tests. */
import { MouseButton } from "@tsgui/core";
import { CircularProgressDirection } from "@tsgui/layout";
import { describe, expect, test } from "bun:test";
import {
  isOnBarHandle,
  isOnCircularHandle,
  pointerToAngleValue,
  pointerToValue,
  resolveGeometry,
} from "../src/widgets/slider/geometry.ts";

describe("pointerToValue", () => {
  test("horizontal: handle inset accounted, ends clamp", () => {
    // HANDLE_SIZE = 16 — usable track is x 8..192.
    expect(
      pointerToValue({ coord: 8, start: 0, length: 200, min: 0, max: 100 })
    ).toBe(0);
    expect(
      pointerToValue({ coord: 100, start: 0, length: 200, min: 0, max: 100 })
    ).toBeCloseTo(50, 5);
    expect(
      pointerToValue({ coord: 192, start: 0, length: 200, min: 0, max: 100 })
    ).toBe(100);
    expect(
      pointerToValue({ coord: -50, start: 0, length: 200, min: 0, max: 100 })
    ).toBe(0);
    expect(
      pointerToValue({ coord: 500, start: 0, length: 200, min: 0, max: 100 })
    ).toBe(100);
  });

  test("vertical flips (top = max)", () => {
    expect(
      pointerToValue({
        coord: 0,
        start: 0,
        length: 200,
        flip: true,
        min: 0,
        max: 100,
      })
    ).toBe(100);
    expect(
      pointerToValue({
        coord: 200,
        start: 0,
        length: 200,
        flip: true,
        min: 0,
        max: 100,
      })
    ).toBe(0);
  });

  test("step rounds to the nearest increment", () => {
    expect(
      pointerToValue({
        coord: 100,
        start: 0,
        length: 200,
        min: 0,
        max: 100,
        step: 25,
      })
    ).toBe(50);
    expect(
      pointerToValue({
        coord: 130,
        start: 0,
        length: 200,
        min: 0,
        max: 100,
        step: 25,
      })
    ).toBe(75);
  });
});

describe("pointerToAngleValue", () => {
  const geo = {
    cx: 50,
    cy: 50,
    startAngle: -Math.PI / 2,
    sweep: Math.PI * 2,
    direction: 1 as const,
    min: 0,
    max: 100,
  };

  test("clockwise from the top", () => {
    // Straight up = start → min; right = quarter → 25.
    expect(
      pointerToAngleValue({ ...geo, pointerX: 50, pointerY: 46 })
    ).toBeCloseTo(0, 5);
    expect(
      pointerToAngleValue({ ...geo, pointerX: 60, pointerY: 50 })
    ).toBeCloseTo(25, 5);
    expect(
      pointerToAngleValue({ ...geo, pointerX: 50, pointerY: 54 })
    ).toBeCloseTo(50, 5);
  });

  test("wrap-around lands back at the start", () => {
    const almost = pointerToAngleValue({ ...geo, pointerX: 50, pointerY: 40 });
    expect(almost).toBeLessThan(5);
  });

  test("counter-clockwise runs the other way", () => {
    const ccw = {
      ...geo,
      direction: -1 as const,
    };
    // Left of center is a quarter sweep counter-clockwise.
    expect(
      pointerToAngleValue({ ...ccw, pointerX: 40, pointerY: 50 })
    ).toBeCloseTo(25, 5);
  });

  test("sweep is clamped — no value past the end angle", () => {
    const half = { ...geo, sweep: Math.PI };
    expect(pointerToAngleValue({ ...half, pointerX: 40, pointerY: 50 })).toBe(
      100
    );
  });

  test("step rounds", () => {
    expect(
      pointerToAngleValue({ ...geo, pointerX: 60, pointerY: 50, step: 50 })
    ).toBe(50);
  });
});

describe("resolveGeometry", () => {
  test("center, angles, and direction sign from props", () => {
    const node = { screenX: 10, screenY: 20, width: 48, height: 48 };
    const geo = resolveGeometry(
      {
        value: 0,
        size: 48,
        startAngle: 0,
        sweep: Math.PI,
        direction: CircularProgressDirection.CounterClockwise,
      },
      node
    );
    expect(geo.cx).toBe(34);
    expect(geo.cy).toBe(44);
    expect(geo.startAngle).toBe(0);
    expect(geo.sweep).toBe(Math.PI);
    expect(geo.direction).toBe(-1);
  });
});

describe("handle hit tests", () => {
  test("isOnBarHandle matches the handle square", () => {
    const node = { screenX: 0, screenY: 0, width: 200, height: 24 };
    // ratio 0.5 → handle x = 0.5 * (200 - 16) = 92..108, y centered 4..20.
    expect(
      isOnBarHandle({ x: 100, y: 12, node, ratio: 0.5, isVertical: false })
    ).toBe(true);
    expect(
      isOnBarHandle({ x: 130, y: 12, node, ratio: 0.5, isVertical: false })
    ).toBe(false);
  });

  test("isOnCircularHandle matches the dot at the value's angle", () => {
    const geo = resolveGeometry(
      { value: 0, size: 48, thickness: 0.15 },
      { screenX: 0, screenY: 0, width: 48, height: 48 }
    );
    // value 25 → quarter sweep clockwise from top → right side, mid radius.
    const on = isOnCircularHandle({
      x: 50,
      y: 23,
      geo,
      value: 25,
      size: 48,
      thickness: 0.15,
    });
    expect(on).toBe(true);
    const off = isOnCircularHandle({
      x: 50,
      y: 23,
      geo,
      value: 75,
      size: 48,
      thickness: 0.15,
    });
    expect(off).toBe(false);
  });

  test("MouseButton None is the no-button sentinel", () => {
    expect(MouseButton.None).toBe(0);
  });
});
