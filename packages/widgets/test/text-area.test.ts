/**
 * TextArea through the real dispatch path — pointer click → caret via
 * the y position, Up/Down arrow navigation, Enter inserts a newline,
 * scroll follows the caret, controlled resync. Mirrors text-input's
 * dispatch harness; the module-level editing-state map is keyed by
 * stableId which restarts per reconciler, so tests reset in setup.
 */
import { AnimationManager } from "@vulcania/animation";
import { KeyModifiers, type ReconcilableWidget, StateStore } from "@vulcania/core";
import {
  FocusDispatcher,
  type KeyboardInputEvent,
  KeyboardInputKind,
  PointerDispatcher,
  type PointerInputEvent,
  PointerInputKind,
} from "@vulcania/interactions";
import { type LayoutContext, layoutFlex, type LayoutNode } from "@vulcania/layout";
import { beforeEach, describe, expect, test } from "bun:test";
import { renderHeadless } from "../src/index.ts";
import {
  KeyCode,
  Reconciler,
  resetTextAreaEditingStates,
  resetTextInputEditingStates,
  TextArea,
  textAreaEditingStateOf,
} from "../src/index.ts";
import { writeEditingState } from "../src/widgets/text-area/state.ts";

interface Harness {
  click(x: number, y: number): void;
  /** Button-down only — pair with drag/release for drag-select. */
  press(x: number, y: number): void;
  release(x: number, y: number): void;
  type(text: string): void;
  key(key: number, modifiers?: KeyModifiers): void;
  render(widget: ReconcilableWidget): void;
  /** Re-layout only (what a paint pass sees between edits). */
  relayout(): void;
  state(): { value: string; caret: number; anchor: number; scrollY: number };
  drag(x: number, y: number): void;
}

function setup(widget: ReconcilableWidget): Harness {
  resetTextAreaEditingStates();
  const stateStore = new StateStore();
  const reconciler = new Reconciler(stateStore);
  const focus = new FocusDispatcher();
  const pointer = new PointerDispatcher();

  const layoutIndex = new Map<number, LayoutNode>();
  const focusableNodes: LayoutNode[] = [];
  const ctx: LayoutContext = {
    layoutIndex,
    focusableNodes,
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

  const pointerEvents: PointerInputEvent[] = [];
  const keyboardEvents: KeyboardInputEvent[] = [];

  const dispatch = (): void => {
    pointer.dispatch({ events: pointerEvents, root, layoutIndex });
    focus.dispatch({
      pointerEvents,
      keyboardEvents,
      root,
      layoutIndex,
      focusableNodes,
    });
    pointerEvents.length = 0;
    keyboardEvents.length = 0;
  };

  return {
    click(x, y) {
      pointerEvents.push(
        { kind: PointerInputKind.Down, x, y, button: 1 },
        { kind: PointerInputKind.Up, x, y, button: 1 }
      );
      dispatch();
    },
    press(x, y) {
      pointerEvents.push({ kind: PointerInputKind.Down, x, y, button: 1 });
      dispatch();
    },
    release(x, y) {
      pointerEvents.push({ kind: PointerInputKind.Up, x, y, button: 1 });
      dispatch();
    },
    drag(x, y) {
      pointerEvents.push({ kind: PointerInputKind.Move, x, y });
      dispatch();
    },
    type(text) {
      keyboardEvents.push({
        kind: KeyboardInputKind.Char,
        key: 0,
        text,
        modifiers: KeyModifiers.None,
      } as KeyboardInputEvent);
      dispatch();
    },
    key(key, modifiers = KeyModifiers.None) {
      keyboardEvents.push({
        kind: KeyboardInputKind.KeyDown,
        key,
        modifiers,
      } as KeyboardInputEvent);
      dispatch();
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
    relayout() {
      root = layoutFlex({
        node: reconciler.reconcile(widget).widget,
        x: 0,
        y: 0,
        availableWidth: 400,
        availableHeight: 300,
        ctx,
      });
    },
    state() {
      let id = 0;
      for (const node of layoutIndex.values()) {
        if (node.widget.type === "TextArea") id = node.stableId;
      }
      const s = textAreaEditingStateOf(id, {});
      return {
        value: s.value,
        caret: s.caret,
        anchor: s.anchor,
        scrollY: s.scrollY,
      };
    },
  };
}

const field = (
  extra: Parameters<typeof TextArea>[0] = {}
): ReconcilableWidget =>
  TextArea({ style: { width: 200, height: 90 }, ...extra });

describe("TextArea pointer mapping (y position)", () => {
  test("click on the second line lands at that line's column", () => {
    // Two lines; click 10 rows down = line 2, x = 16px ≈ col 2 of "beta".
    const h = setup(
      field({ defaultValue: "alpha\nbeta", style: { width: 200, height: 90 } })
    );
    h.click(24, 8 + 18 + 9); // content x=24-8=16 → col 2; y=35 → row 1
    h.type("X");
    // "beta" with X at col 2 → "beXta" on line 2.
    expect(h.state().value).toBe("alpha\nbeXta");
  });

  test("click past the line end lands at the line end", () => {
    const h = setup(
      field({ defaultValue: "alpha\nbeta", style: { width: 200, height: 90 } })
    );
    h.click(8 + 40 + 40, 8 + 9); // row 0, x past "alpha" (80px > 40px)
    h.type("!");
    expect(h.state().value).toBe("alpha!\nbeta");
  });

  test("drag after click extends the selection to the pointer", () => {
    const h = setup(
      field({ defaultValue: "alpha\nbeta", style: { width: 200, height: 90 } })
    );
    h.press(8, 8 + 9); // row 0 col 0 — button HELD
    h.drag(8 + 16, 8 + 18 + 9); // drag to row 1, col 2 of "beta" → caret 8
    h.release(8 + 16, 8 + 18 + 9);
    h.type("-");
    expect(h.state().value).toBe("-ta");
  });
});

describe("TextArea keyboard", () => {
  test("the Enter key inserts a newline (real SDL path: keydown, not text input)", () => {
    const h = setup(
      field({ defaultValue: "ab", style: { width: 200, height: 90 } })
    );
    h.click(8 + 8, 8 + 9); // row 0, one char in — caret between a and b
    h.key(KeyCode.Enter); // plain keydown — what SDL actually sends
    expect(h.state().value).toBe("a\nb");
  });

  test("a Char event carrying \\n also inserts (parity path)", () => {
    const h = setup(
      field({ defaultValue: "ab", style: { width: 200, height: 90 } })
    );
    h.click(8 + 8, 8 + 9);
    h.type("\n");
    expect(h.state().value).toBe("a\nb");
  });

  test("backspace at line start joins lines", () => {
    const h = setup(
      field({ defaultValue: "a\nb", style: { width: 200, height: 90 } })
    );
    h.click(8 + 60, 8 + 18 + 9); // row 1, end of "b" → caret 3
    h.key(KeyCode.Left); // caret 2 — before "b", after the \n
    h.key(KeyCode.Backspace); // deletes the \n → lines join
    expect(h.state().value).toBe("ab");
  });

  test("down arrow moves to the next line keeping the column", () => {
    const h = setup(
      field({ defaultValue: "abcdef\nxyz", style: { width: 400, height: 90 } })
    );
    h.click(8 + 48, 8 + 9); // col 6 of "abcdef" (48px = 6 chars)
    console.log("post-click:", JSON.stringify(h.state()));
    h.key(KeyCode.Down);
    console.log("post-down:", JSON.stringify(h.state()));
    h.type("!");
    console.log("post-type:", JSON.stringify(h.state()));
    expect(h.state().value).toBe("abcdef\nxyz!");
  });

  test("up arrow returns to the remembered column", () => {
    const h = setup(
      field({ defaultValue: "abcdef\nxyz!", style: { width: 400, height: 90 } })
    );
    h.click(8 + 48, 8 + 18 + 9); // col 6 clamped to end of "xyz!" → col 4
    h.key(KeyCode.Up); // col 4 of "abcdef"
    h.type("!");
    expect(h.state().value).toBe("abcd!ef\nxyz!");
  });

  test("ctrl/cmd+A selects all; typing replaces", () => {
    const h = setup(
      field({ defaultValue: "a\nb", style: { width: 200, height: 90 } })
    );
    h.click(8 + 60, 8 + 18 + 9); // focus the field
    h.key(KeyCode.A, KeyModifiers.Meta); // select all
    h.type("x"); // replaces the whole selection
    expect(h.state().value).toBe("x");
  });
});

describe("TextArea scroll-follow", () => {
  test("typing past the visible lines scrolls the view down", () => {
    // 90px tall → 8 padding * 2 → 74px content / 18px rows = 4 visible.
    const value = Array.from({ length: 10 }, (_, i) => `l${i}`).join("\n");
    const h = setup(
      field({ defaultValue: value, style: { width: 200, height: 90 } })
    );
    h.click(8 + 9, 8 + 9); // caret at start (row 0 of the document)
    for (let i = 0; i < 6; i++) {
      h.key(KeyCode.Down);
      h.relayout();
    }
    expect(h.state().scrollY).toBeGreaterThan(0);
    expect(h.state().scrollY).toBeLessThanOrEqual(6);
  });
});

describe("TextArea controlled resync", () => {
  test("app re-render with a new value adopts it wholesale", () => {
    let value = "one";
    const widget = () =>
      TextArea({
        value,
        onChange: (next) => {
          value = next.toUpperCase();
        },
        style: { width: 200, height: 90 },
      });

    const stateStore = new StateStore();
    const reconciler = new Reconciler(stateStore);
    const focus = new FocusDispatcher();
    const layoutIndex = new Map<number, LayoutNode>();
    const focusableNodes: LayoutNode[] = [];
    const ctx: LayoutContext = {
      layoutIndex,
      focusableNodes,
      scrollOffsetOf: () => ({ x: 0, y: 0 }),
      getStableId: reconciler.getStableId,
      measureText: (text) => ({ width: text.length * 8, height: 18 }),
      getImageSize: () => null,
    };

    let root = layoutFlex({
      node: reconciler.reconcile(widget()).widget,
      x: 0,
      y: 0,
      availableWidth: 400,
      availableHeight: 300,
      ctx,
    });

    const dispatchKey = (text: string): void => {
      focus.dispatch({
        pointerEvents: [
          { kind: PointerInputKind.Down, x: 10, y: 10, button: 1 },
        ],
        keyboardEvents: [],
        root,
        layoutIndex,
        focusableNodes,
      });
      root = layoutFlex({
        node: reconciler.reconcile(widget()).widget,
        x: 0,
        y: 0,
        availableWidth: 400,
        availableHeight: 300,
        ctx,
      });
      focus.dispatch({
        pointerEvents: [],
        keyboardEvents: [
          {
            kind: KeyboardInputKind.Char,
            key: 0,
            text,
            modifiers: KeyModifiers.None,
          } as KeyboardInputEvent,
        ],
        root,
        layoutIndex,
        focusableNodes,
      });
      root = layoutFlex({
        node: reconciler.reconcile(widget()).widget,
        x: 0,
        y: 0,
        availableWidth: 400,
        availableHeight: 300,
        ctx,
      });
    };

    dispatchKey("Z"); // "oneZ" → onChange → value "ONEZ" → re-render adopts
    expect(value).toBe("ONEZ");
  });
});

describe("TextArea placeholder + empty-field caret", () => {
  beforeEach(() => {
    resetTextAreaEditingStates();
    resetTextInputEditingStates();
  });

  const FOCUSED = {
    hovered: false,
    focused: true,
    pressed: false,
    checked: false,
    disabled: false,
  };

  test("style.lineHeight drives the wrapped-line spacing", () => {
    const frame = renderHeadless(
      TextArea({
        value: "aaaa bbbb cccc",
        style: { width: 100, height: 90, lineHeight: 30 },
      }),
      { width: 100, height: 90 }
    );

    const textOps = frame.ops.filter((op) => op.op === "text") as Array<{
      y: number;
    }>;
    expect(textOps.length).toBe(2);
    expect(textOps[1]!.y).toBe(textOps[0]!.y + 30);
  });

  test("placeholder shows exactly once when the field is empty", () => {
    const frame = renderHeadless(
      TextArea({ placeholder: "Type here", style: { width: 120, height: 60 } }),
      { width: 120, height: 60 }
    );

    const texts = frame.ops
      .filter((op) => op.op === "text")
      .map((op) => (op as { text: string }).text);
    expect(texts.filter((t) => t === "Type here")).toHaveLength(1);
  });

  test("Enter on an empty field never re-paints the placeholder", () => {
    // Value "\n": two EMPTY visual lines — the old painter drew the
    // placeholder on every blank line.
    const frame = renderHeadless(
      TextArea({
        value: "\n",
        placeholder: "Type here",
        style: { width: 120, height: 60 },
      }),
      { width: 120, height: 60 }
    );

    const texts = frame.ops
      .filter((op) => op.op === "text")
      .map((op) => (op as { text: string }).text);
    expect(texts).toEqual([]); // no text ops at all, placeholder included
  });

  test("blank lines between paragraphs draw no placeholder either", () => {
    const frame = renderHeadless(
      TextArea({
        value: "a\n\nb",
        placeholder: "Type here",
        style: { width: 200, height: 90 },
      }),
      { width: 200, height: 90 }
    );

    const texts = frame.ops
      .filter((op) => op.op === "text")
      .map((op) => (op as { text: string }).text);
    expect(texts).toEqual(["a", "b"]);
  });

  test("caret x uses the injected measure, not the 8px estimate", () => {
    // measureText = 10px/char: caret at index 4 must sit at
    // contentX(8) + 40 = 48 — the old bug painted it at 8 + 32 = 40
    // because the factory dropped measureText from the descriptor.
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
        style: { width: 200, height: 60 },
        measureText: (t) => t.length * 10,
      }),
      {
        width: 200,
        height: 60,
        statesOf: () => FOCUSED,
        animationManager: animations,
      }
    );

    const caret = frame.ops.find(
      (op) => op.op === "rect" && (op as { w: number }).w === 1
    ) as { x: number } | undefined;
    expect(caret?.x).toBe(48);
  });

  test("an empty focused field still shows the caret", () => {
    const animations = new AnimationManager();
    animations.tick(0);
    const frame = renderHeadless(
      TextArea({ placeholder: "Type here", style: { width: 120, height: 60 } }),
      {
        width: 120,
        height: 60,
        statesOf: () => FOCUSED,
        animationManager: animations,
      }
    );

    const caret = frame.ops.find(
      (op) => op.op === "rect" && (op as { w: number }).w === 1
    );
    expect(caret).toBeDefined();
  });
});
