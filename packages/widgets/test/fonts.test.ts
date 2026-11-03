/**
 * Named fonts through the harness — Label.font resolves via
 * PaintContext.fonts: layout (wrap widths) and paint (text ops) must
 * measure the SAME font, or the wrapped lines disagree with what was
 * painted (the measureText-injection drift class).
 */
import type { TextPainter } from "@vulcania/paint";
import { describe, expect, test } from "bun:test";
import { Label, renderHeadless, View } from "../src/index.ts";

/** Named stub: 12px/char — clearly distinct from the 8px default. */
const NAMED_W = 12;
const namedFont: TextPainter = {
  draw: () => {},
  measure: (text) => ({ width: text.length * NAMED_W, height: 20 }),
};

const fontsCtx = (name: string): TextPainter | undefined =>
  name === "display" ? namedFont : undefined;

const textOps = (
  frame: ReturnType<typeof renderHeadless>
): Array<{ text: string; y: number }> =>
  frame.ops
    .filter((op) => op.op === "text")
    .map((op) => ({
      text: (op as { text: string }).text,
      y: (op as { y: number }).y,
    }));

describe("named fonts (Label.font)", () => {
  test("label with a font prop wraps at the named measure", () => {
    // Box 100px. Named (12px/char): "aaaa bbbb" = 108 > 100 → 3 lines.
    // Default (8px/char): "aaaa bbbb" = 72 fits → 2 lines.
    const frame = renderHeadless(
      View({
        style: { width: 100, height: 100 },
        children: [
          Label({
            text: "aaaa bbbb cccc",
            font: "display",
            style: { width: 100 },
          }),
        ],
      }),
      { width: 100, height: 100, fonts: fontsCtx }
    );

    expect(textOps(frame).map((op) => op.text)).toEqual([
      "aaaa",
      "bbbb",
      "cccc",
    ]);
  });

  test("no font prop measures the default font (compat)", () => {
    const frame = renderHeadless(
      View({
        style: { width: 100, height: 100 },
        children: [Label({ text: "aaaa bbbb cccc", style: { width: 100 } })],
      }),
      { width: 100, height: 100, fonts: fontsCtx }
    );

    expect(textOps(frame).map((op) => op.text)).toEqual(["aaaa bbbb", "cccc"]);
  });

  test("unknown font name with a throwing lookup fails loud", () => {
    const throwing = (name: string): TextPainter => {
      throw new Error(`[FontManager] Font not found: ${name}`);
    };

    expect(() =>
      renderHeadless(
        Label({ text: "hello", font: "nope", style: { width: 100 } }),
        { width: 100, height: 100, fonts: throwing }
      )
    ).toThrow("[FontManager] Font not found: nope");
  });

  test("font prop without a fonts lookup falls back to the default", () => {
    // Headless compat: no manager injected → default font, no throw.
    const frame = renderHeadless(
      Label({ text: "hello", font: "display", style: { width: 100 } }),
      { width: 100, height: 100 }
    );
    expect(textOps(frame).map((op) => op.text)).toEqual(["hello"]);
  });
});
