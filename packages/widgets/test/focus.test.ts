/**
 * Focus dispatcher — click-to-focus (nearest focusable ancestor), blur on
 * dead-space clicks, tab cycling with shift, key/char routing to the
 * focused widget, and Enter/Space activation synthesis.
 */
import { describe, expect, test } from "bun:test";
import {
  FlexDirection,
  layoutFlex,
  type LayoutContext,
  type LayoutNode,
} from "@tsgui/layout";
import {
  Button,
  Checkbox,
  FocusDispatcher,
  KeyCode,
  PointerDispatcher,
  KeyModifiers,
  KeyboardInputKind,
  Label,
  MouseButton,
  PointerInputKind,
  Reconciler,
  StateStore,
  View,
  type KeyboardInputEvent,
  type PointerInputEvent,
  type ReconcilableWidget,
} from "../src/index.ts";

interface Harness {
  pointer(kind: PointerInputKind, x: number, y: number): void;
  key(key: number, modifiers?: KeyModifiers, repeat?: boolean): void;
  char(text: string): void;
  dispatcher: FocusDispatcher;
  root(): LayoutNode;
  focus(target: number | { stableId: number }): void;
  /** stableId of the widget whose descriptor carries this key. */
  stableIdOf(key: string): number;
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

  const root = layoutFlex({
    node: reconciler.reconcile(widget).widget,
    x: 0,
    y: 0,
    availableWidth: 400,
    availableHeight: 300,
    ctx,
  });

  const dispatchFocus = (): void =>
    focus.dispatch({
      pointerEvents: [],
      keyboardEvents: [],
      root,
      layoutIndex,
      focusableNodes,
    });

  return {
    pointer(kind, x, y) {
      const pointerEvents: PointerInputEvent[] = [
        {
          kind,
          x,
          y,
          button:
            kind === PointerInputKind.Down || kind === PointerInputKind.Up
              ? MouseButton.Left
              : undefined,
        },
      ];
      pointer.dispatch({ events: pointerEvents, root, layoutIndex });
      focus.dispatch({
        pointerEvents,
        keyboardEvents: [],
        root,
        layoutIndex,
        focusableNodes,
      });
    },
    key(key, modifiers = KeyModifiers.None, repeat = false) {
      focus.dispatch({
        pointerEvents: [],
        keyboardEvents: [
          {
            kind: KeyboardInputKind.KeyDown,
            key,
            modifiers,
            repeat,
          } as KeyboardInputEvent,
        ],
        root,
        layoutIndex,
        focusableNodes,
      });
    },
    char(text) {
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
    },
    dispatcher: focus,
    root: () => root,
    focus(target) {
      focus.focus(target);
      dispatchFocus();
    },
    stableIdOf(key: string): number {
      for (const node of layoutIndex.values()) {
        if ((node.widget as ReconcilableWidget).key === key) return node.stableId;
      }
      return 0;
    },
  };
}

// Two stacked buttons ("one" y 0..32, "two" y 40..72).
interface FocusLog {
  focus: string[];
  blur: string[];
  clicks: string[];
  keys: string[];
}

const twoButtons = (log: FocusLog): ReconcilableWidget =>
  View({
    style: {
      width: 400,
      height: 300,
      flexDirection: FlexDirection.Column,
      gap: 8,
    },
    children: ["one", "two"].map((name) =>
      Button({
        key: name,
        style: { width: 88, height: 32 },
        onFocus: () => log.focus.push(name),
        onBlur: () => log.blur.push(name),
        onClick: () => log.clicks.push(name),
        onKeyDown: (p) => log.keys.push(`${name}:${p.key}`),
      })
    ),
  });

describe("FocusDispatcher", () => {
  test("click-to-focus and blur on dead space", () => {
    const log: FocusLog = { focus: [], blur: [], clicks: [], keys: [] };
    const h = setup(twoButtons(log));

    h.pointer(PointerInputKind.Down, 40, 16); // button one
    expect(log.focus).toEqual(["one"]);
    expect(h.dispatcher.focusedStableId).toBe(h.stableIdOf("one"));

    h.pointer(PointerInputKind.Down, 350, 250); // dead space
    expect(log.blur).toEqual(["one"]);
    expect(h.dispatcher.focusedStableId).toBeNull();
  });

  test("tab cycles forward, shift-tab back", () => {
    const log: FocusLog = { focus: [], blur: [], clicks: [], keys: [] };
    const h = setup(twoButtons(log));

    h.key(KeyCode.Tab);
    expect(log.focus).toEqual(["one"]);
    h.key(KeyCode.Tab);
    expect(log.focus).toEqual(["one", "two"]);
    h.key(KeyCode.Tab, KeyModifiers.Shift);
    expect(log.focus).toEqual(["one", "two", "one"]);
    expect(log.blur).toEqual(["one", "two"]);
  });

  test("keys and chars route only to the focused widget", () => {
    const log: FocusLog = { focus: [], blur: [], clicks: [], keys: [] };
    const h = setup(twoButtons(log));

    h.pointer(PointerInputKind.Down, 40, 56); // button two
    h.key(KeyCode.A);
    h.char("x");

    expect(log.keys).toEqual(["two:97"]);
  });

  test("Enter activates the focused button (synthesized click)", () => {
    const log: FocusLog = { focus: [], blur: [], clicks: [], keys: [] };
    const h = setup(twoButtons(log));

    h.pointer(PointerInputKind.Down, 40, 16);
    h.key(KeyCode.Enter);
    h.key(KeyCode.Enter, KeyModifiers.None, true); // repeat — no re-click

    expect(log.clicks).toEqual(["one"]);
  });

  test("nearest focusable ancestor wins for non-focusable children", () => {
    const log: FocusLog = { focus: [], blur: [], clicks: [], keys: [] };
    const h = setup(
      View({
        style: { width: 400, height: 300, focusable: true },
        key: "container",
        children: [Label({ text: "inside", style: { width: 50, height: 18 } })],
      })
    );

    h.pointer(PointerInputKind.Down, 10, 5); // on the label
    expect(log.focus).toEqual([]); // no onFocus on the container…
    expect(h.dispatcher.focusedStableId).toBe(h.stableIdOf("container"));
  });

  test("programmatic focus + blur", () => {
    const log: FocusLog = { focus: [], blur: [], clicks: [], keys: [] };
    const h = setup(twoButtons(log));

    h.focus(h.stableIdOf("two"));
    expect(log.focus).toEqual(["two"]);

    h.dispatcher.blur();
    h.focus(h.stableIdOf("one")); // pending applied on next dispatch
    expect(log.blur).toEqual(["two"]);
    expect(log.focus).toEqual(["two", "one"]);
  });

  test("checkbox activation via Space while focused", () => {
    const changes: boolean[] = [];
    let value = false;
    const h = setup(
      Checkbox({
        checked: value,
        onCheckedChange: (next) => {
          changes.push(next);
          value = next;
        },
      })
    );

    h.pointer(PointerInputKind.Down, 8, 8);
    h.key(KeyCode.Space);

    expect(changes).toEqual([true]);
  });
});
