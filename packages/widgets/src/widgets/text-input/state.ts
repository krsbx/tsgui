/**
 * TextInput editing-state store + clipboard seam. Keyed by stableId so
 * caret/selection survive the re-renders every keystroke triggers; the
 * Reconciler's unmount hook releases entries. The clipboard defaults to
 * a no-op seam — the gallery/desktop shell binds SDL's clipboard; tests
 * inject fakes.
 */
import type { TextInputState } from "./core.ts";

export type { TextInputState };
import { makeTextInputState } from "./core.ts";

const editingStates = new Map<number, TextInputState>();

/**
 * Editing state accessor — also what the painter reads to draw
 * caret/selection.
 *
 * Controlled reconciliation: when `props.value` differs from the stored
 * value, the app has re-rendered with new text — adopt it and clamp the
 * caret (the standard controlled-input contract).
 */
export function editingStateOf(
  stableId: number,
  props: { value?: string }
): TextInputState {
  let state = editingStates.get(stableId);
  if (!state) {
    state = makeTextInputState({ value: props.value });
    editingStates.set(stableId, state);
  }

  if (props.value !== undefined && props.value !== state.value) {
    state = {
      value: props.value,
      caret: Math.min(state.caret, props.value.length),
      anchor: Math.min(state.anchor, props.value.length),
      scrollX: state.scrollX,
    };
    editingStates.set(stableId, state);
  }

  return state;
}

export function writeEditingState(stableId: number, state: TextInputState): void {
  editingStates.set(stableId, state);
}

export function deleteEditingState(stableId: number): void {
  editingStates.delete(stableId);
}

/** Clipboard seam — defaults to a no-op; overridden by the app shell. */
export const textInputClipboard: { get(): string; set(text: string): void } = {
  get: () => "",
  set: () => {},
};
