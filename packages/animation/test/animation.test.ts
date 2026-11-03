/**
 * AnimationManager + easings + interpolation — the transition state
 * machine: first sighting snaps, the change starts the transition
 * clock, mid-flight samples sit between from and to, retargets
 * continue from the displayed value, completion culs. The clock is
 * injected (`tick(now)`) so tests are deterministic.
 */
import { EasingName } from "@vulcania/layout";
import { describe, expect, test } from "bun:test";
import {
  AnimationManager,
  easings,
  formatPacked,
  interpolate,
  parseColor,
} from "../src/index.ts";

describe("easings", () => {
  test("every curve maps 0→0 and 1→1", () => {
    for (const fn of Object.values(easings)) {
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
    }
  });

  test("ease accelerates: mid-point past linear", () => {
    expect(easings[EasingName.Ease](0.5)).toBeGreaterThan(0.5);
    expect(easings[EasingName.Linear](0.5)).toBe(0.5);
  });
});

describe("interpolate", () => {
  test("numbers lerp linearly", () => {
    expect(interpolate(0, 10, 0.5)).toBe(5);
    expect(interpolate(4, 2, 0.25)).toBe(3.5);
  });

  test("colors interpolate per channel and format #rrggbbaa", () => {
    const mid = interpolate("#000000ff", "#ffffff00", 0.5) as string;
    expect(mid).toBe("#80808080");

    // Endpoints round-trip exactly.
    expect(interpolate("#102a43", "#102a43", 0.7)).toBe("#102a43ff");
  });
});

describe("formatPacked / parseColor round trip", () => {
  test("u32 → hex8 → u32 is identity", () => {
    const packed = parseColor("#02061759");
    expect(parseColor(formatPacked(packed))).toBe(packed);
  });
});

describe("AnimationManager", () => {
  test("first sighting snaps — no overlay, resolved passes through", () => {
    const m = new AnimationManager();
    m.tick(1000);

    const resolved = { backgroundColor: "#111111" };
    expect(m.applyOverlay(1, resolved, { duration: 100 })).toBe(resolved);
  });

  test("a change transitions: mid-flight value sits between from and to", () => {
    const m = new AnimationManager();
    m.tick(1000);
    // First sighting snaps; the change registers on this same frame and
    // the transition clock starts here.
    m.applyOverlay(1, { backgroundColor: "#000000" }, { duration: 100 });
    m.applyOverlay(1, { backgroundColor: "#ffffff" }, { duration: 100 });

    m.tick(1050); // halfway through the eased 100ms transition
    const out = m.applyOverlay(
      1,
      { backgroundColor: "#ffffff" },
      {
        duration: 100,
      }
    );

    const color = (out as { backgroundColor: string }).backgroundColor;
    expect(color).not.toBe("#ffffff");
    expect(color).not.toBe("#000000");

    const r = parseColor(color) & 255;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(255);
  });

  test("completed transitions settle — the overlay stops", () => {
    const m = new AnimationManager();
    m.tick(1000);
    m.applyOverlay(1, { backgroundColor: "#000000" }, { duration: 100 });
    m.applyOverlay(1, { backgroundColor: "#ffffff" }, { duration: 100 });

    // Continuous frames — the gallery paints every frame; the final
    // in-window sample records the target color (parse-normalized
    // against the 6-digit style string), and expiry culls the active.
    m.tick(1100);
    const atEnd = m.applyOverlay(
      1,
      { backgroundColor: "#ffffff" },
      {
        duration: 100,
      }
    );
    expect(
      parseColor((atEnd as { backgroundColor: string }).backgroundColor)
    ).toBe(parseColor("#ffffff"));

    m.tick(1200); // past the duration — settled, resolved passes through
    const resolved = { backgroundColor: "#ffffff" };
    expect(m.applyOverlay(1, resolved, { duration: 100 })).toBe(resolved);
  });

  test("a running transition continues from its start, not re-anchored", () => {
    const m = new AnimationManager();
    m.tick(0);
    m.applyOverlay(
      1,
      { opacity: 0 },
      { duration: 100, easing: EasingName.Linear }
    );
    m.applyOverlay(
      1,
      { opacity: 1 },
      { duration: 100, easing: EasingName.Linear }
    );

    m.tick(50); // 50% through the 0→1 transition
    expect(
      m.applyOverlay(
        1,
        { opacity: 1 },
        { duration: 100, easing: EasingName.Linear }
      ).opacity
    ).toBeCloseTo(0.5, 5);

    m.tick(75); // 75% through
    expect(
      m.applyOverlay(
        1,
        { opacity: 1 },
        { duration: 100, easing: EasingName.Linear }
      ).opacity
    ).toBeCloseTo(0.75, 5);
  });

  test("changing the target mid-flight retargets from the displayed value", () => {
    const m = new AnimationManager();
    m.tick(0);
    m.applyOverlay(
      1,
      { opacity: 0 },
      { duration: 100, easing: EasingName.Linear }
    );
    m.applyOverlay(
      1,
      { opacity: 1 },
      { duration: 100, easing: EasingName.Linear }
    );

    m.tick(50); // displayed 0.5
    m.applyOverlay(
      1,
      { opacity: 1 },
      { duration: 100, easing: EasingName.Linear }
    );

    // Retarget to 0.25 mid-flight: the retargeting call itself returns
    // the displayed value it continues from (raw 0 on the new leg).
    m.tick(75);
    const out = m.applyOverlay(
      1,
      { opacity: 0.25 },
      {
        duration: 100,
        easing: EasingName.Linear,
      }
    );
    expect(out.opacity).toBeCloseTo(0.75, 5);

    // A quarter into the 0.75 → 0.25 leg.
    m.tick(100);
    const next = m.applyOverlay(
      1,
      { opacity: 0.25 },
      {
        duration: 100,
        easing: EasingName.Linear,
      }
    );
    expect(next.opacity).toBeCloseTo(0.75 + (0.25 - 0.75) * 0.25, 5);
  });

  test("destroy releases the widget's transitions — next sighting snaps", () => {
    const m = new AnimationManager();
    m.tick(0);
    m.applyOverlay(7, { backgroundColor: "#000000" }, { duration: 50 });
    m.applyOverlay(7, { backgroundColor: "#ffffff" }, { duration: 50 });
    m.applyOverlay(8, { backgroundColor: "#000000" }, { duration: 50 });

    m.destroy(7);
    m.tick(10);
    const resolved = { backgroundColor: "#ffffff" };
    expect(m.applyOverlay(7, resolved, { duration: 50 })).toBe(resolved);
  });

  test("subKey isolates transitions per sub-widget", () => {
    const m = new AnimationManager();
    m.tick(0);
    m.applyOverlay(
      3,
      { backgroundColor: "#000000" },
      { duration: 100 },
      "track"
    );
    m.applyOverlay(
      3,
      { backgroundColor: "#000000" },
      { duration: 100 },
      "handle"
    );

    m.tick(50);
    const track = m.applyOverlay(
      3,
      { backgroundColor: "#ffffff" },
      { duration: 100 },
      "track"
    );

    // Only the track animates; the handle was never re-targeted.
    expect(track.backgroundColor).not.toBe("#ffffff");
  });
});
