/**
 * TextInput — the editing contract through the focus + pointer
 * dispatchers: click-to-focus routes chars, typing inserts at the caret
 * and fires onChange, arrows/shift select, backspace/delete respect the
 * selection, clipboard seam, and the painter draws text/selection/caret.
 */
import { describe, expect, test } from "bun:test";
import {
  layoutFlex,
  type LayoutContext,
  type LayoutNode,
} from "@tsgui/layout";
import {
  editingStateOf,
  FocusDispatcher,
  KeyCode,
  KeyModifiers,
  KeyboardInputKind,
  MouseButton,
  parseColor,
  PointerDispatcher,
  PointerInputKind,
  Reconciler,
  renderHeadless,
  StateStore,
  textInputClipboard,
  TextInput,
  View,
  PaintOpKind,
  type PaintOp,
  type KeyboardInputEvent,
  type PointerInputEvent,
  type ReconcilableWidget,
} from "../src/index.ts";
import { Palette } from "../src/index.ts";

interface Harness {
  click(x: number, y: number): void;
  type(text: string): void;
  key(key: number, modifiers?: KeyModifiers, repeat?: boolean): void;
  /** Re-reconcile + relayout — what the app loop does on state change. */
  render(widget: ReconcilableWidget): void;
  dispatcher: FocusDispatcher;
  stableId(): number;
  state(): { value: string; caret: number; anchor: number; scrollX: number };
}

function setup(widget: ReconcilableWidget): Harness {
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

  const focusDispatch = (
    pointerEvents: PointerInputEvent[],
    keyboardEvents: KeyboardInputEvent[]
  ): void =>
    focus.dispatch({
      pointerEvents,
      keyboardEvents,
      root,
      layoutIndex,
      focusableNodes,
    });

  return {
    click(x, y) {
      const events: PointerInputEvent[] = [
        { kind: PointerInputKind.Down, x, y, button: MouseButton.Left },
      ];
      pointer.dispatch({ events, root, layoutIndex });
      focusDispatch(events, []);
    },
    type(text) {
      focusDispatch([], [
        {
          kind: KeyboardInputKind.Char,
          key: 0,
          text,
          modifiers: KeyModifiers.None,
        } as KeyboardInputEvent,
      ]);
    },
    key(key, modifiers = KeyModifiers.None, repeat = false) {
      focusDispatch([], [
        {
          kind: KeyboardInputKind.KeyDown,
          key,
          modifiers,
          repeat,
        } as KeyboardInputEvent,
      ]);
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
    dispatcher: focus,
    stableId() {
      for (const node of layoutIndex.values()) {
        if (node.widget.type === "TextInput") return node.stableId;
      }
      return 0;
    },
    state() {
      const id = (() => {
        for (const node of layoutIndex.values()) {
          if (node.widget.type === "TextInput") return node.stableId;
        }
        return 0;
      })();
      return { ...editingStateOf(id, { value: undefined }) };
    },
  };
}

const field = (
  value: string,
  onChange: (next: string) => void,
  extra: Parameters<typeof TextInput>[0] = {}
): ReconcilableWidget =>
  TextInput({ value, onChange, style: { width: 200, height: 24 }, ...extra });

describe("TextInput editing", () => {
  test("click focuses; typed chars land at the caret and fire onChange", () => {
    const changes: string[] = [];
    let value = "";
    const h = setup(field(value, (next) => { changes.push(next); value = next; }));
    const render = (): void => h.render(field(value, (next) => { changes.push(next); value = next; }));

    h.click(100, 12);
    h.type("h");
    render();
    h.type("i");

    expect(changes).toEqual(["h", "hi"]);
    expect(h.state().value).toBe("hi");
    expect(h.state().caret).toBe(2);
  });

  test("unfocused chars never arrive", () => {
    const changes: string[] = [];
    const h = setup(field("", (next) => changes.push(next)));

    h.type("x");
    expect(changes).toEqual([]);
  });

  test("backspace deletes behind the caret; arrows move it", () => {
    const changes: string[] = [];
    let value = "abc";
    const h = setup(field(value, (next) => { changes.push(next); value = next; }));
    const render = (): void => h.render(field(value, (next) => { changes.push(next); value = next; }));

    h.click(200, 12); // past the end → caret at 3
    h.key(KeyCode.Backspace);
    render();
    expect(h.state().value).toBe("ab");
    expect(h.state().caret).toBe(2);

    h.key(KeyCode.Left);
    expect(h.state().caret).toBe(1);
    h.key(KeyCode.Backspace);
    expect(h.state().value).toBe("b");
  });

  test("shift+arrows build a selection; typing replaces it", () => {
    let value = "hello";
    const h = setup(field(value, (next) => { value = next; }));
    const render = (): void => h.render(field(value, (next) => { value = next; }));

    h.click(8, 12); // caret 0
    h.key(KeyCode.Right, KeyModifiers.Shift);
    h.key(KeyCode.Right, KeyModifiers.Shift);
    expect(h.state().caret).toBe(2);
    expect(h.state().anchor).toBe(0);

    h.type("H");
    render();
    // Selection "he" (caret 0→2) replaced by "H" — "Hllo" via onChange.
    expect(h.state().value).toBe("Hllo");
    expect(h.state().caret).toBe(1);
  });

  test("click positions the caret by x (8px monospace mock)", () => {
    const h = setup(field("hello", () => {}));

    h.click(8 + 24, 12); // 24px in = 3 chars
    expect(h.state().caret).toBe(3);
  });

  test("clipboard seam: cut and paste through the modifier path", () => {
    const clipboard: string[] = [];
    let value = "hello";
    const h = setup(field(value, (next) => { value = next; }));
    const render = (): void => h.render(field(value, (next) => { value = next; }));
    textInputClipboard.get = () => clipboard[clipboard.length - 1] ?? "";
    textInputClipboard.set = (text: string) => clipboard.push(text);

    // Select "hel" (caret 0 → shift+right ×3), cut it — caret lands at
    // the selection start.
    h.click(8, 12);
    h.key(KeyCode.Right, KeyModifiers.Shift);
    h.key(KeyCode.Right, KeyModifiers.Shift);
    h.key(KeyCode.Right, KeyModifiers.Shift);
    h.key(KeyCode.X, KeyModifiers.Control);
    render();
    expect(clipboard).toEqual(["hel"]);
    expect(h.state().value).toBe("lo");
    expect(h.state().caret).toBe(0);

    // Paste at the caret (the selection start).
    textInputClipboard.set("ppy");
    h.key(KeyCode.V, KeyModifiers.Control);
    expect(h.state().value).toBe("ppylo");
  });


});

describe("TextInput paint", () => {
  test("placeholder renders when empty; text renders when set", () => {
    const empty = renderHeadless(
      View({ children: [TextInput({ value: "", placeholder: "type here" })] }),
      { width: 300, height: 100 }
    );
    const filled = renderHeadless(
      View({ children: [TextInput({ value: "hi" })] }),
      { width: 300, height: 100 }
    );

    type TextOp = PaintOp & { text: string; tint: number };
    const textOps = (ops: PaintOp[]): string[] =>
      ops.filter(
        (op): op is TextOp =>
          op.op === PaintOpKind.Text && typeof (op as TextOp).text === "string"
      ).map((op) => op.text);
    expect(textOps(empty.ops)).toEqual(["type here"]);
    expect(textOps(filled.ops)).toEqual(["hi"]);
  });

  test("focused field paints selection, text, and caret", () => {
    // stableIds are deterministic in renderHeadless: root = 1, field = 2.
    const seed = editingStateOf(2, { value: "hello" });
    seed.caret = 4;
    seed.anchor = 1;

    const frame = renderHeadless(
      View({ children: [TextInput({ value: "hello" })] }),
      {
        width: 300,
        height: 100,
        statesOf: (node) => ({
          hovered: false,
          pressed: false,
          focused: node.stableId === 2,
          checked: false,
          disabled: false,
        }),
      }
    );

    type Fill = PaintOp & { color: number; x: number; y: number; w: number; h: number };
    type TextOp = PaintOp & { text: string; tint: number };
    const fills = frame.ops.filter(
      (op): op is Fill => op.op === PaintOpKind.Rect
    );
    const texts = frame.ops.filter((op): op is TextOp => op.op === PaintOpKind.Text);

    // Selection highlight: "ell" = 24px wide at the 8px monospace mock.
    const selection = fills.filter(
      (op) => op.color === parseColor(Palette.selection)
    );
    expect(selection.length).toBe(1);
    expect(selection[0]).toMatchObject({ w: 24, h: 18 });

    // Text drawn once in the text color.
    expect(texts.map((op) => op.text)).toEqual(["hello"]);
    expect(texts[0]!.tint).toBe(parseColor(Palette.text));

    // Caret bar present (static until the AnimationManager clocks it).
    const caret = fills.filter((op) => op.w === 1);
    expect(caret.length).toBe(1);
  });

  test("unfocused field paints text but no caret", () => {
    const seed = editingStateOf(2, { value: "hello" });
    seed.caret = 4;
    seed.anchor = 1;

    const frame = renderHeadless(
      View({ children: [TextInput({ value: "hello" })] }),
      { width: 300, height: 100 }
    );

    const caret = frame.ops.filter(
      (op): op is PaintOp & { w: number } =>
        op.op === PaintOpKind.Rect && (op as PaintOp & { w: number }).w === 1
    );
    expect(caret.length).toBe(0);
  });
});

