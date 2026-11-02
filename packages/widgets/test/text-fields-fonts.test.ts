/**
 * Named fonts on text FIELDS (TextInput/TextArea) — the painter must
 * resolve the named font for both drawing and glyph measure, so the
 * caret and selection land where the painted glyphs actually are (the
 * 8px-estimate drift bug, caught on Label first and extended here).
 */
import { AnimationManager } from "@tsgui/animation";
import type { TextPainter } from "@tsgui/paint";
import { beforeEach, describe, expect, test } from "bun:test";
import {
  renderHeadless,
  resetTextAreaEditingStates,
  resetTextInputEditingStates,
  TextArea,
  TextInput,
} from "../src/index.ts";
import { writeEditingState } from "../src/widgets/text-area/state.ts";
import { writeEditingState as writeInputState } from "../src/widgets/text-input/state.ts";

const NAMED_W = 12;
const namedFont: TextPainter = {
  draw: () => {},
  measure: (text) => ({ width: text.length * NAMED_W, height: 20 }),
};

const FOCUSED = {
  hovered: false,
  focused: true,
  pressed: false,
  checked: false,
  disabled: false,
};

describe("text fields with named fonts", () => {
  beforeEach(() => {
    resetTextAreaEditingStates();
    resetTextInputEditingStates();
  });

  test("TextInput caret x follows the named font's measure", () => {
    // Seed caret at index 4 ("abcd|"); named measure = 12px/char →
    // caret x = contentX(8) + 48 = 56 (8px estimate would give 40).
    writeInputState(1, {
      value: "abcd",
      caret: 4,
      anchor: 4,
      scrollX: 0,
    });
    const animations = new AnimationManager();
    animations.tick(0);

    const frame = renderHeadless(
      TextInput({
        value: "abcd",
        font: "display",
        measureText: (t) => t.length * NAMED_W,
        style: { width: 200, height: 28 },
      }),
      {
        width: 200,
        height: 28,
        statesOf: () => FOCUSED,
        animationManager: animations,
        fonts: (name) => (name === "display" ? namedFont : undefined),
      }
    );

    const caret = frame.ops.find(
      (op) => op.op === "rect" && (op as { w: number }).w === 1
    ) as { x: number } | undefined;
    expect(caret?.x).toBe(8 + 4 * NAMED_W);
  });

  test("TextArea caret x follows the named font's measure", () => {
    writeEditingState(1, {
      value: "abcd",
      caret: 4,
      anchor: 4,
      scrollY: 0,
      goalColumn: null,
    });
    const animations = new AnimationManager();
    animations.tick(0);

    const frame = renderHeadless(
      TextArea({
        value: "abcd",
        font: "display",
        measureText: (t) => t.length * NAMED_W,
        style: { width: 200, height: 60 },
      }),
      {
        width: 200,
        height: 60,
        statesOf: () => FOCUSED,
        animationManager: animations,
        fonts: (name) => (name === "display" ? namedFont : undefined),
      }
    );

    const caret = frame.ops.find(
      (op) => op.op === "rect" && (op as { w: number }).w === 1
    ) as { x: number } | undefined;
    expect(caret?.x).toBe(8 + 4 * NAMED_W);
  });

  test("TextArea selection highlight width follows the named measure", () => {
    writeEditingState(1, {
      value: "abcd",
      caret: 4,
      anchor: 0,
      scrollY: 0,
      goalColumn: null,
    });

    const frame = renderHeadless(
      TextArea({
        value: "abcd",
        font: "display",
        style: { width: 200, height: 60 },
      }),
      {
        width: 200,
        height: 60,
        statesOf: () => FOCUSED,
        fonts: (name) => (name === "display" ? namedFont : undefined),
      }
    );

    // The field background rect is 200 wide — the selection is the
    // narrower one: 4 chars at 12px → 48.
    const highlight = frame.ops.find(
      (op) =>
        (op.op === "rect" || op.op === "rrect") &&
        (op as { w: number }).w > 4 &&
        (op as { w: number }).w < 200
    ) as { w: number } | undefined;
    expect(highlight?.w).toBe(4 * NAMED_W);
  });
});
