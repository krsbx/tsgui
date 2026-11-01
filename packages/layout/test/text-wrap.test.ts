/**
 * Text line wrapping — greedy word packing with hard character breaks,
 * plus the frame-cache hand-off (record during measurement, take when
 * the node is built).
 */
import { describe, expect, test } from "bun:test";
import {
  recordTextLayout,
  takeTextLayout,
  type WidgetDescriptor,
  WidgetType,
  wrapText,
} from "../src/index.ts";

/** Monospace measure: 10px per character. */
const measure = (text: string): number => text.length * 10;

describe("wrapText", () => {
  test("fits in one line when narrow enough", () => {
    expect(wrapText({ text: "hello", maxWidth: 50, measure })).toEqual([
      "hello",
    ]);
  });

  test("splits on words to fit the constraint", () => {
    // "three blind" = 11 chars = 110px > 100, so "three" breaks;
    // "blind mice" = exactly 100px, still one line.
    const lines = wrapText({
      text: "three blind mice",
      maxWidth: 100,
      measure,
    });
    expect(lines).toEqual(["three", "blind mice"]);
  });

  test("hard-breaks a word wider than the constraint", () => {
    // "abcdefghij" is 100px; 40px holds four characters.
    const lines = wrapText({ text: "abcdefghij", maxWidth: 40, measure });
    expect(lines).toEqual(["abcd", "efgh", "ij"]);
  });

  test("mixed: long word breaks, remainder wraps by words", () => {
    const lines = wrapText({
      text: "go abcdefghij now",
      maxWidth: 40,
      measure,
    });
    expect(lines).toEqual(["go", "abcd", "efgh", "ij", "now"]);
  });

  test("degenerate constraints return safely", () => {
    expect(wrapText({ text: "hello", maxWidth: 0, measure })).toEqual([
      "hello",
    ]);
    expect(wrapText({ text: "", maxWidth: 100, measure })).toEqual([]);
    expect(wrapText({ text: "   ", maxWidth: 100, measure })).toEqual(["   "]);
  });
});

describe("text layout frame cache", () => {
  test("record → take hands off once, then clears", () => {
    const widget: WidgetDescriptor = {
      type: WidgetType.Label,
      props: { text: "x" },
      style: {},
    };
    recordTextLayout(widget, { lines: ["x"], lineAdvance: 20 });

    expect(takeTextLayout(widget)).toEqual({ lines: ["x"], lineAdvance: 20 });
    expect(takeTextLayout(widget)).toBeNull();
  });

  test("unmeasured widgets take null", () => {
    const widget: WidgetDescriptor = {
      type: WidgetType.Label,
      props: { text: "y" },
      style: {},
    };
    expect(takeTextLayout(widget)).toBeNull();
  });
});
