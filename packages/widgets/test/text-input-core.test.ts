/** Text-editing core semantics — pure operations, no events or stores. */
import { describe, expect, test } from "bun:test";
import {
  backspace,
  cut,
  deleteForward,
  insertText,
  makeTextInputState,
  moveCaret,
  recomputeScrollX,
  selectAll,
  selectionRange,
  xToCaret,
} from "../src/widgets/text-input/core.ts";

const state = (over: Partial<ReturnType<typeof makeTextInputState>> = {}) => ({
  ...makeTextInputState({ value: "hello" }),
  ...over,
});

describe("text editing core", () => {
  test("insertText replaces the selection or inserts at the caret", () => {
    expect(insertText(state(), " XY").value).toBe("hello XY");
    expect(insertText(state({ caret: 0, anchor: 0 }), "A").value).toBe("Ahello");
    // Selection "ell" (1..4) replaced by "IP".
    const sel = state({ caret: 4, anchor: 1 });
    const next = insertText(sel, "IP");
    expect(next.value).toBe("hIPo");
    expect(next.caret).toBe(3);
    expect(next.anchor).toBe(3);
  });

  test("backspace: selection first, else previous char, bounded at 0", () => {
    expect(backspace(state({ caret: 2, anchor: 2 })).value).toBe("hllo");
    expect(backspace(state({ caret: 4, anchor: 1 })).value).toBe("ho");
    expect(backspace(state({ caret: 0, anchor: 0 })).value).toBe("hello");
  });

  test("deleteForward: selection first, else next char, bounded at end", () => {
    expect(deleteForward(state({ caret: 2, anchor: 2 })).value).toBe("helo");
    expect(deleteForward(state({ caret: 4, anchor: 1 })).value).toBe("ho");
    expect(deleteForward(state({ caret: 5, anchor: 5 })).value).toBe("hello");
  });

  test("selectionRange normalizes", () => {
    expect(selectionRange(state({ caret: 4, anchor: 1 }))).toEqual({
      start: 1,
      end: 4,
    });
    expect(selectionRange(state({ caret: 2, anchor: 2 }))).toBeNull();
  });

  test("moveCaret: clamp, shift extends from the anchor", () => {
    expect(moveCaret(state({ caret: 1, anchor: 1 }), "left", false)).toMatchObject({
      caret: 0,
      anchor: 0,
    });
    // Already at 0 — stays.
    expect(moveCaret(state({ caret: 0, anchor: 0 }), "left", false).caret).toBe(0);
    // Shift extends: anchor stays at 3 while caret moves.
    const extended = moveCaret(state({ caret: 3, anchor: 3 }), "right", true);
    expect(extended).toMatchObject({ caret: 4, anchor: 3 });
    expect(moveCaret(state(), "home", false)).toMatchObject({ caret: 0, anchor: 0 });
    expect(moveCaret(state(), "end", true)).toMatchObject({
      caret: 5,
      anchor: 5,
    });
  });

  test("selectAll spans the value", () => {
    expect(selectAll(state())).toMatchObject({ caret: 5, anchor: 0 });
  });

  test("cut removes the selection and reports the text", () => {
    const result = cut(state({ caret: 4, anchor: 1 }));
    expect(result.cutText).toBe("ell");
    expect(result.state.value).toBe("ho");
    expect(cut(state()).cutText).toBeNull();
  });

  test("xToCaret snaps to the nearest boundary", () => {
    // Monospace-ish measure: 10px per char.
    const measure = (text: string): number => text.length * 10;
    expect(xToCaret({ value: "hello", relX: 0, measure })).toBe(0);
    expect(xToCaret({ value: "hello", relX: 8, measure })).toBe(1);
    expect(xToCaret({ value: "hello", relX: 16, measure })).toBe(2);
    expect(xToCaret({ value: "hello", relX: 500, measure })).toBe(5);
  });

  test("scroll keeps the caret inside the viewport, minimal movement", () => {
    expect(recomputeScrollX({ caretX: 50, currentScrollX: 0, visibleWidth: 100 })).toBe(0);
    expect(recomputeScrollX({ caretX: 20, currentScrollX: 50, visibleWidth: 100 })).toBe(20);
    expect(recomputeScrollX({ caretX: 200, currentScrollX: 0, visibleWidth: 100 })).toBe(100);
  });
});
