/**
 * TextArea core — pure edit ops over a multiline value: verbatim
 * wrapping (visual lines are exact substrings), click mapping
 * (yToCaret), vertical navigation with goal column, and scroll
 * clamping. 10px/char monospace measure keeps the math readable.
 */
import { describe, expect, test } from "bun:test";
import {
  backspace,
  caretVisual,
  deleteForward,
  insertText,
  layoutLines,
  makeTextAreaState,
  moveCaret,
  scrollYFor,
  selectAll,
  selectedText,
  yToCaret,
} from "../src/widgets/text-area/core.ts";
import { CaretDirection } from "../src/widgets/text-input/core.ts";

const measure = (text: string): number => text.length * 10;

describe("layoutLines (verbatim wrap)", () => {
  test("single short line stays one visual line", () => {
    const layout = layoutLines({ value: "hello", maxWidth: 100, measure });
    expect(layout.visual).toEqual([{ text: "hello", start: 0 }]);
  });

  test("wraps at word boundaries into exact substrings", () => {
    // "three blind" = 11 chars = 110px > 100 → "three" | "blind mice"
    const layout = layoutLines({
      value: "three blind mice",
      maxWidth: 100,
      measure,
    });
    expect(layout.visual).toEqual([
      { text: "three", start: 0 },
      { text: "blind mice", start: 6 },
    ]);
  });

  test("newlines produce empty visual lines", () => {
    const layout = layoutLines({ value: "a\n\nb", maxWidth: 100, measure });
    expect(layout.visual).toEqual([
      { text: "a", start: 0 },
      { text: "", start: 2 },
      { text: "b", start: 3 },
    ]);
  });

  test("a word wider than the box hard-breaks by characters", () => {
    const layout = layoutLines({ value: "abcdefgh", maxWidth: 30, measure });
    expect(layout.visual).toEqual([
      { text: "abc", start: 0 },
      { text: "def", start: 3 },
      { text: "gh", start: 6 },
    ]);
  });

  test("caret indices survive the wrap: start + column == absolute", () => {
    const value = "the quick brown fox";
    const layout = layoutLines({ value, maxWidth: 100, measure });
    for (const line of layout.visual) {
      const text = value.slice(line.start, line.start + line.text.length);
      expect(text).toBe(line.text); // verbatim substring
    }
  });
});

describe("yToCaret (click mapping)", () => {
  const layout = layoutLines({
    value: "alpha\nbeta gamma",
    maxWidth: 100,
    measure,
  });

  test("line is chosen by y (10px rows), column by x", () => {
    // Row 0, x=5 → halfway into "a" → col 1 (nearest-edge rounding).
    expect(
      yToCaret({ layout, relY: 0, lineAdvance: 10, relX: 5, measure })
    ).toBe(1);
    // Row 1 (y=10..19) → "beta gamma"; x=10 → "b|" → col 1 + start 6.
    expect(
      yToCaret({ layout, relY: 15, lineAdvance: 10, relX: 10, measure })
    ).toBe(7);
  });

  test("y past the last line clamps to it", () => {
    expect(
      yToCaret({ layout, relY: 500, lineAdvance: 10, relX: 0, measure })
    ).toBe(6);
  });

  test("x past the line end lands at the line end", () => {
    // Row 0 "alpha" is 5 chars; x=999 → col 5.
    expect(
      yToCaret({ layout, relY: 0, lineAdvance: 10, relX: 999, measure })
    ).toBe(5);
  });
});

describe("moveCaret (vertical navigation)", () => {
  // Two logical lines, each short enough to stay unwrapped.
  const value = "abcdef\nxyz";
  const layout = layoutLines({ value, maxWidth: 100, measure });
  const at = (caret: number): ReturnType<typeof makeTextAreaState> => ({
    ...makeTextAreaState({ value: "" }),
    value,
    caret,
    anchor: caret,
    scrollY: 0,
    goalColumn: null,
  });

  test("up keeps the column: col 2 of xyz → col 2 of abcdef", () => {
    // Index 9 = col 2 of "xyz" (start 7). Up keeps column 2.
    const out = moveCaret(at(9), CaretDirection.Up, false, layout);
    expect(out.caret).toBe(2);
    expect(out.goalColumn).toBe(2);
  });

  test("down clamps to the shorter line but remembers the goal", () => {
    // Index 6 = col 6 of "abcdef" → down to "xyz" (3 chars) clamps to
    // its end (10) while remembering goal 6.
    const step1 = moveCaret(at(6), CaretDirection.Down, false, layout);
    expect(step1.caret).toBe(10);
    expect(step1.goalColumn).toBe(6);

    // From col 2 of line 0, down lands at col 2 of "xyz" (start 7 → 9).
    const step2 = moveCaret(at(2), CaretDirection.Down, false, layout);
    expect(step2.caret).toBe(9);
  });

  test("goal column is reset by horizontal movement", () => {
    const s = { ...at(9), goalColumn: 6 };
    const out = moveCaret(s, CaretDirection.Left, false, layout);
    expect(out.goalColumn).toBeNull();
  });

  test("up at the first line snaps to the document start", () => {
    const out = moveCaret(at(3), CaretDirection.Up, false, layout);
    expect(out.caret).toBe(0);
    expect(out.goalColumn).toBeNull();
  });

  test("home/end address the visual line", () => {
    expect(moveCaret(at(9), CaretDirection.Home, false, layout).caret).toBe(7);
    expect(moveCaret(at(7), CaretDirection.End, false, layout).caret).toBe(10);
  });
});

describe("multiline edits", () => {
  test("insertText with a newline splits the line", () => {
    const state = {
      ...makeTextAreaState({ value: "" }),
      value: "ab",
      caret: 1,
      anchor: 1,
    };
    const out = insertText(state, "\n");
    expect(out.value).toBe("a\nb");
    expect(out.caret).toBe(2);
  });

  test("backspace at line start joins to the previous line", () => {
    const state = {
      ...makeTextAreaState({ value: "" }),
      value: "a\nb",
      caret: 2,
      anchor: 2,
    };
    expect(backspace(state).value).toBe("ab");
  });

  test("deleteForward at line end joins the next line", () => {
    const state = {
      ...makeTextAreaState({ value: "" }),
      value: "a\nb",
      caret: 1,
      anchor: 1,
    };
    expect(deleteForward(state).value).toBe("ab");
  });

  test("selection spanning lines replaces across the newline", () => {
    const state = {
      ...makeTextAreaState({ value: "" }),
      value: "a\nb",
      caret: 0,
      anchor: 3,
    };
    expect(selectedText(state)).toBe("a\nb");
    expect(insertText(state, "x").value).toBe("x");
  });

  test("selectAll spans the whole value", () => {
    const state = {
      ...makeTextAreaState({ value: "" }),
      value: "a\nb",
      caret: 1,
      anchor: 1,
    };
    const out = selectAll(state);
    expect(selectedText(out)).toBe("a\nb");
  });
});

describe("scrollYFor (caret-in-view)", () => {
  const layout = layoutLines({
    value: Array.from({ length: 10 }, (_, i) => `line ${i}`).join("\n"),
    maxWidth: 100,
    measure,
  });

  test("caret above the window scrolls up", () => {
    expect(scrollYFor({ layout, caret: 0, scrollY: 5, visibleLines: 3 })).toBe(
      0
    );
  });

  test("caret below the window scrolls down", () => {
    const caret = layout.visual[8]!.start;
    expect(scrollYFor({ layout, caret, scrollY: 0, visibleLines: 3 })).toBe(6);
  });

  test("clamps at the bottom of the document", () => {
    const caret = layout.visual[9]!.start;
    expect(scrollYFor({ layout, caret, scrollY: 99, visibleLines: 3 })).toBe(7); // 10 lines - 3 visible
  });
});

describe("caretVisual", () => {
  const layout = layoutLines({
    value: "alpha\nbeta gamma",
    maxWidth: 100,
    measure,
  });

  test("caret on the second logical line reports that line", () => {
    expect(caretVisual(layout, 6)).toEqual({ index: 1, column: 0 });
    expect(caretVisual(layout, 9)).toEqual({ index: 1, column: 3 });
  });

  test("caret sitting on the newline belongs to the line above", () => {
    // Index 5 is the '\n' after "alpha".
    expect(caretVisual(layout, 5)).toEqual({ index: 0, column: 5 });
  });
});
