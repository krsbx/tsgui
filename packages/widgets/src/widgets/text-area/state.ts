/**
 * TextArea editing-state store — keyed by stableId so caret/selection/
 * scroll survive the re-renders every keystroke triggers; the
 * Reconciler's unmount hook releases entries. Shares the TextInput
 * clipboard seam (one OS clipboard across widgets).
 */
import type { TextAreaLayout, TextAreaState } from "./core.ts";
import { layoutLines, makeTextAreaState } from "./core.ts";

export type { TextAreaState };

const editingStates = new Map<number, TextAreaState>();

/**
 * Editing-state accessor for handler/dispatch paths — the controlled
 * reconciliation point: when `props.value` differs from the stored
 * value, the app re-rendered with new text — adopt it wholesale
 * (multiline values have no meaningful caret clamp, so the caret moves
 * to the end like a fresh field).
 */
export function editingStateOf(
  stableId: number,
  props: { value?: string; defaultValue?: string }
): TextAreaState {
  let state = editingStates.get(stableId);
  if (!state) {
    state = makeTextAreaState({ value: props.value ?? props.defaultValue });
    editingStates.set(stableId, state);
  }

  if (props.value !== undefined && props.value !== state.value) {
    state = {
      ...makeTextAreaState({ value: props.value }),
    };
    editingStates.set(stableId, state);
  }

  return state;
}

export function writeEditingState(
  stableId: number,
  state: TextAreaState
): void {
  editingStates.set(stableId, state);
}

/** Raw read for painters — no controlled reconciliation (paint lag). */
export function peekEditingState(
  stableId: number,
  props?: { value?: string; defaultValue?: string }
): TextAreaState {
  return (
    editingStates.get(stableId) ??
    makeTextAreaState({ value: props?.value ?? props?.defaultValue })
  );
}

export function deleteEditingState(stableId: number): void {
  editingStates.delete(stableId);
  layoutCaches.delete(stableId);
}

/** Test isolation — clears every field's editing state. */
export function resetTextAreaEditingStates(): void {
  editingStates.clear();
  layoutCaches.clear();
}

interface LayoutCache {
  value: string;
  maxWidth: number;
  /** Probe width — invalidates the cache when the measure changes. */
  probe: number;
  layout: TextAreaLayout;
}

const layoutCaches = new Map<number, LayoutCache>();

/**
 * The wrapped-line layout for this field — computed against the live
 * value + content width and cached per stableId (invalidated when the
 * value, the width, or the measure changes — a probe width detects a
 * swapped measure function, e.g. a named font vs an app override). The
 * painter and the handlers both call this; same inputs produce the same
 * lines, so the click/caret mapping always agrees with what was
 * painted.
 */
export function ensureLayout(
  stableId: number,
  state: TextAreaState,
  maxWidth: number,
  measure: (text: string) => number
): TextAreaLayout {
  const probe = measure("MMMMMMMMMM");
  const cached = layoutCaches.get(stableId);
  if (
    cached &&
    cached.value === state.value &&
    cached.maxWidth === maxWidth &&
    cached.probe === probe
  ) {
    return cached.layout;
  }

  const layout = layoutLines({ value: state.value, maxWidth, measure });
  layoutCaches.set(stableId, { value: state.value, maxWidth, probe, layout });
  return layout;
}
