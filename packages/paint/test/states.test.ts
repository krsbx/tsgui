/**
 * effectiveStatesFor — the states fold the paint walk uses, now shared
 * with the devtools detail view. The contract under test: dispatcher
 * states pass through, and controls fold their checked flag from
 * controlled props or the store — a detail panel must report exactly
 * what the frame rendered.
 */
import { type InteractionStates, StateStore } from "@vulcania/core";
import { WidgetType } from "@vulcania/layout";
import { describe, expect, test } from "bun:test";
import { effectiveStatesFor } from "../src/index.ts";

const IDLE: InteractionStates = {
  hovered: false,
  focused: false,
  pressed: false,
  checked: false,
  disabled: false,
};

function node(
  type: string,
  props: Record<string, unknown>
): Parameters<typeof effectiveStatesFor>[1] {
  return {
    stableId: 7,
    widget: { type, props, style: {} },
    children: [],
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    screenX: 0,
    screenY: 0,
  } as Parameters<typeof effectiveStatesFor>[1];
}

describe("effectiveStatesFor", () => {
  test("plain widgets pass dispatcher states through", () => {
    const states = effectiveStatesFor(
      { statesOf: () => ({ ...IDLE, hovered: true }) },
      node("View", {})
    );
    expect(states).toEqual({ ...IDLE, hovered: true });
  });

  test("no statesOf → STATES_NONE base", () => {
    const states = effectiveStatesFor({}, node("View", {}));
    expect(states).toEqual({ ...IDLE });
  });

  test("controlled checked prop wins for checkbox", () => {
    const states = effectiveStatesFor(
      {},
      node(WidgetType.Checkbox, { checked: true })
    );
    expect(states.checked).toBe(true);
  });

  test("uncontrolled checkbox folds the store-backed flag", () => {
    const store = new StateStore();
    const states = effectiveStatesFor(
      { stateStore: store },
      node(WidgetType.Checkbox, { defaultChecked: true })
    );
    expect(states.checked).toBe(true);
  });

  test("radio folds the named group selection", () => {
    const store = new StateStore();
    const states = effectiveStatesFor(
      { stateStore: store },
      node(WidgetType.Radio, {
        name: "flavor",
        value: "mint",
        groupDefaultValue: "mint",
      })
    );
    expect(states.checked).toBe(true);
  });
});
