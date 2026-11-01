/**
 * Pointer dispatcher semantics — ported flying-pan behavior: hover
 * enter/leave, click = down+up on the same widget, drag-off cancellation,
 * press capture, and double-click counting. Plus the controlled checked
 * widgets riding on it.
 */
import {
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  WidgetType,
} from "@tsgui/layout";
import { describe, expect, test } from "bun:test";
import {
  Checkbox,
  MouseButton,
  type PaintOp,
  paintTree,
  Palette,
  parseColor,
  PointerDispatcher,
  type PointerInputEvent,
  PointerInputKind,
  Radio,
  RadioGroup,
  type ReconcilableWidget,
  Reconciler,
  renderHeadless,
  StateStore,
  Toggle,
  View,
} from "../src/index.ts";

interface Harness {
  root: LayoutNode;
  layoutIndex: Map<number, LayoutNode>;
  dispatcher: PointerDispatcher;
  fire(events: PointerInputEvent[]): void;
  move(x: number, y: number): PointerInputEvent;
  down(x: number, y: number): PointerInputEvent;
  up(x: number, y: number): PointerInputEvent;
  /** Re-reconcile + relayout — what the app loop does on state change. */
  render(next: ReconcilableWidget): void;
}

function setup(widget: ReconcilableWidget): Harness {
  const stateStore = new StateStore();
  const reconciler = new Reconciler(stateStore);
  const reconciled = reconciler.reconcile(widget);

  const layoutIndex = new Map<number, LayoutNode>();
  const ctx: LayoutContext = {
    layoutIndex,
    focusableNodes: [],
    scrollOffsetOf: () => ({ x: 0, y: 0 }),
    getStableId: reconciler.getStableId,
    measureText: (text) => ({ width: text.length * 8, height: 18 }),
    getImageSize: () => null,
  };

  // The dispatcher must always hit-test the CURRENT tree — `root` tracks
  // the latest layoutFlex output via the mutable box below.
  let root = layoutFlex({
    node: reconciled.widget,
    x: 0,
    y: 0,
    availableWidth: 400,
    availableHeight: 300,
    ctx,
  });

  const dispatcher = new PointerDispatcher();
  const fire = (events: PointerInputEvent[]): void =>
    dispatcher.dispatch({ events, root, layoutIndex, stateStore });

  const render = (next: ReconcilableWidget): void => {
    const reconciledNext = reconciler.reconcile(next);
    layoutIndex.clear();
    root = layoutFlex({
      node: reconciledNext.widget,
      x: 0,
      y: 0,
      availableWidth: 400,
      availableHeight: 300,
      ctx,
    });
  };

  return {
    get root() {
      return root;
    },
    layoutIndex,
    dispatcher,
    fire,
    render,
    move: (x, y) => ({ kind: PointerInputKind.Move, x, y }),
    down: (x, y) => ({
      kind: PointerInputKind.Down,
      x,
      y,
      button: MouseButton.Left,
    }),
    up: (x, y) => ({
      kind: PointerInputKind.Up,
      x,
      y,
      button: MouseButton.Left,
    }),
  };
}

describe("PointerDispatcher", () => {
  test("click = down + up on the same widget", () => {
    const counts: number[] = [];
    const { fire, move, down, up } = setup(
      View({
        style: { width: 100, height: 50 },
        onClick: (p) => counts.push(p.count),
      })
    );

    fire([move(50, 25), down(50, 25), up(50, 25)]);

    expect(counts).toEqual([1]);
  });

  test("drag-off cancels the press — no click on release elsewhere", () => {
    const clicks: number[] = [];
    const { fire, move, down, up } = setup(
      View({
        style: { width: 100, height: 50 },
        onClick: () => clicks.push(1),
      })
    );

    fire([move(50, 25), down(50, 25)]);
    fire([move(300, 250)]); // leave while held → press cancels
    fire([up(300, 250)]);

    expect(clicks).toEqual([]);
  });

  test("press capture routes up + click to the captured widget", () => {
    const hits: string[] = [];
    const { fire, move, down, up } = setup(
      View({
        style: { width: 400, height: 300 },
        onClick: () => hits.push("root"),
        children: [
          View({
            style: { width: 100, height: 50 },
            onClick: () => hits.push("child"),
            onPointerDown: ({ capturePointer }) => capturePointer?.(),
          }),
        ],
      })
    );

    // Down on the child, pointer moves off before release — capture still
    // routes the click to the child.
    fire([move(50, 25), down(50, 25)]);
    fire([move(300, 250), up(300, 250)]);

    expect(hits).toEqual(["child"]);
  });

  test("hover enter/leave fire across boundary crossings", () => {
    const events: string[] = [];
    const { fire, move } = setup(
      View({
        style: { width: 100, height: 50 },
        onPointerEnter: () => events.push("enter"),
        onPointerLeave: () => events.push("leave"),
      })
    );

    fire([move(50, 25), move(300, 250), move(50, 25)]);

    expect(events).toEqual(["enter", "leave", "enter"]);
  });

  test("double-click counting inside the window", () => {
    const counts: number[] = [];
    const { fire, down, up } = setup(
      View({
        style: { width: 100, height: 50 },
        onClick: (p) => counts.push(p.count),
      })
    );

    fire([down(50, 25), up(50, 25)]);
    fire([down(50, 25), up(50, 25)]);
    fire([down(50, 25), up(50, 25)]);

    expect(counts).toEqual([1, 2, 3]);
  });

  test("statesOf drives the paint walk's hover/active styles", () => {
    const { root, dispatcher, fire, move, down } = setup(
      View({
        style: {
          width: 100,
          height: 50,
          backgroundColor: "#ffffff",
          _hover: { backgroundColor: "#eeeeee" },
          _active: { backgroundColor: "#dddddd" },
        },
      })
    );

    const paintedColor = (): number => {
      let color = 0;
      paintTree(
        {
          gpu: {
            fillRect: (o) => {
              color = o.color;
            },
            fillRoundedRect: (o) => {
              color = o.color;
            },
            fillArc: () => {},
            fillRing: () => {},
            drawTexture: () => {},
          },
          font: { draw: () => {} },
          statesOf: (node) => dispatcher.statesOf(node),
        },
        root
      );
      return color;
    };

    const base = paintedColor();
    fire([move(50, 25)]);
    expect(paintedColor()).toBe(parseColor("#eeeeee"));
    fire([down(50, 25)]);
    expect(paintedColor()).toBe(parseColor("#dddddd"));
    expect(base).toBe(parseColor("#ffffff"));
  });
});

describe("controlled checked widgets", () => {
  test("Checkbox reports the flipped value", () => {
    const changes: boolean[] = [];
    let value = false;
    const { fire, render, move, down, up } = setup(
      Checkbox({
        checked: value,
        onCheckedChange: (next) => {
          changes.push(next);
          value = next;
        },
      })
    );
    const clicked = (): void => fire([move(8, 8), down(8, 8), up(8, 8)]);

    clicked();
    render(
      Checkbox({
        checked: value,
        onCheckedChange: (next) => {
          changes.push(next);
          value = next;
        },
      })
    );
    clicked();

    expect(changes).toEqual([true, false]);
  });

  test("disabled Checkbox no-ops", () => {
    const changes: boolean[] = [];
    const { fire, move, down, up } = setup(
      Checkbox({
        checked: false,
        disabled: true,
        onCheckedChange: (next) => changes.push(next),
      })
    );

    fire([move(8, 8), down(8, 8), up(8, 8)]);

    expect(changes).toEqual([]);
  });

  test("Toggle flips through the dispatcher", () => {
    const changes: boolean[] = [];
    let value = false;
    const { fire, render, move, down, up } = setup(
      Toggle({
        checked: value,
        onCheckedChange: (next) => {
          changes.push(next);
          value = next;
        },
      })
    );
    const clicked = (): void => fire([move(10, 12), down(10, 12), up(10, 12)]);

    clicked();
    render(
      Toggle({
        checked: value,
        onCheckedChange: (next) => {
          changes.push(next);
          value = next;
        },
      })
    );
    clicked();

    expect(changes).toEqual([true, false]);
  });

  test("RadioGroup selects exclusively and reports the value", () => {
    const picked: string[] = [];
    let value = "mint";
    const { fire, render, move, down, up, root } = setup(
      RadioGroup({
        value,
        onValueChange: (next) => {
          picked.push(next);
          value = next;
        },
        children: [
          Radio({ value: "mint", label: "Mint" }),
          Radio({ value: "berry", label: "Berry" }),
        ],
      })
    );

    // Group rows stack vertically (8px gap; rows are 18px tall measured) —
    // the second radio's dot sits at (8, ~30). Label text passes clicks
    // through (labels never intercept), so the dot is the target.
    fire([move(8, 30), down(8, 30), up(8, 30)]);
    expect(picked).toEqual(["berry"]);

    // The app rebuilds with the new value; selection flips exclusively.
    render(
      RadioGroup({
        value,
        onValueChange: (next) => {
          picked.push(next);
          value = next;
        },
        children: [
          Radio({ value: "mint", label: "Mint" }),
          Radio({ value: "berry", label: "Berry" }),
        ],
      })
    );

    const selectedIds: number[] = [];
    const collect = (node: LayoutNode): void => {
      if (
        node.widget.type === WidgetType.Radio &&
        node.widget.props["selected"] === true
      ) {
        selectedIds.push(node.stableId);
      }
      for (const child of node.children) collect(child);
    };
    collect(root);
    expect(selectedIds.length).toBe(1);
  });

  test("uncontrolled checkbox persists via the payload state store", () => {
    const changes: boolean[] = [];
    const h = setup(
      Checkbox({
        defaultChecked: true,
        onCheckedChange: (next) => changes.push(next),
      })
    );

    h.fire([
      { kind: PointerInputKind.Down, x: 8, y: 8, button: MouseButton.Left },
      { kind: PointerInputKind.Up, x: 8, y: 8, button: MouseButton.Left },
    ]);
    expect(changes).toEqual([false]);
  });

  test("checked pseudo-state styles merge through the paint walk", () => {
    const frame = renderHeadless(
      View({ children: [Checkbox({ checked: true })] }),
      { width: 100, height: 100 }
    );

    // The checked body paints accent; the tick paints on-accent on top.
    const colors = frame.ops
      .filter((op) => op.op === "rect" || op.op === "rrect")
      .map((op) => (op as { color: number }).color);

    expect(colors).toContain(parseColor(Palette.accent));
    expect(colors).toContain(parseColor(Palette.textOnAccent));
  });

  test("uncontrolled defaults resolve through the harness paint walk", () => {
    // Guard: renderHeadless must thread its store into PaintContext — a
    // missing stateStore resolves every uncontrolled control as unchecked
    // (the gallery regression).
    const checked = renderHeadless(
      View({ children: [Checkbox({ defaultChecked: true })] }),
      { width: 100, height: 100 }
    );
    const unchecked = renderHeadless(
      View({ children: [Checkbox({ defaultChecked: false })] }),
      { width: 100, height: 100 }
    );

    const colorsOf = (frame: { ops: PaintOp[] }): number[] =>
      frame.ops
        .filter((op) => op.op === "rect" || op.op === "rrect")
        .map((op) => (op as { color: number }).color);

    expect(colorsOf(checked)).toContain(parseColor(Palette.accent));
    expect(colorsOf(unchecked)).not.toContain(parseColor(Palette.accent));
  });
});
