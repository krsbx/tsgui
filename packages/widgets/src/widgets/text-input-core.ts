/**
 * Text-editing core — pure operations over the { value, caret, anchor,
 * scrollX } editing state, ported from flying-pan's widget/text-input
 * (state + handler logic) split from any event or store plumbing so the
 * semantics are unit-testable and the widget factory stays thin.
 */

export interface TextInputState {
  value: string;
  caret: number;
  /** Selection anchor — caret === anchor means no selection. */
  anchor: number;
  scrollX: number;
}

export function makeTextInputState(props: {
  value?: string;
}): TextInputState {
  const value = props.value ?? "";

  return { value, caret: value.length, anchor: value.length, scrollX: 0 };
}

/** Normalized [start, end] of the selection, or null when collapsed. */
export function selectionRange(state: {
  caret: number;
  anchor: number;
}): { start: number; end: number } | null {
  if (state.caret === state.anchor) return null;

  return {
    start: Math.min(state.caret, state.anchor),
    end: Math.max(state.caret, state.anchor),
  };
}

/** Keep the caret visible: scroll only when it leaves the viewport. */
export function recomputeScrollX(options: {
  caretX: number;
  currentScrollX: number;
  visibleWidth: number;
}): number {
  const { caretX, currentScrollX, visibleWidth } = options;

  if (caretX < currentScrollX) return caretX;
  if (caretX > currentScrollX + visibleWidth) return caretX - visibleWidth;

  return currentScrollX;
}

/** Insert text at the caret, replacing any selection. */
export function insertText(
  state: TextInputState,
  text: string
): TextInputState {
  const value = state.value;
  const range = selectionRange(state);
  const insertAt = range?.start ?? state.caret;
  const replaceUntil = range?.end ?? state.caret;

  const nextValue = value.slice(0, insertAt) + text + value.slice(replaceUntil);
  const nextCaret = insertAt + text.length;

  return { value: nextValue, caret: nextCaret, anchor: nextCaret, scrollX: state.scrollX };
}

/** Backspace: delete the selection, else the character before the caret. */
export function backspace(state: TextInputState): TextInputState {
  const range = selectionRange(state);
  if (range) {
    return {
      value: state.value.slice(0, range.start) + state.value.slice(range.end),
      caret: range.start,
      anchor: range.start,
      scrollX: state.scrollX,
    };
  }

  if (state.caret === 0) return state;

  return {
    value: state.value.slice(0, state.caret - 1) + state.value.slice(state.caret),
    caret: state.caret - 1,
    anchor: state.caret - 1,
    scrollX: state.scrollX,
  };
}

/** Delete: delete the selection, else the character after the caret. */
export function deleteForward(state: TextInputState): TextInputState {
  const range = selectionRange(state);
  if (range) {
    return {
      value: state.value.slice(0, range.start) + state.value.slice(range.end),
      caret: range.start,
      anchor: range.start,
      scrollX: state.scrollX,
    };
  }

  if (state.caret >= state.value.length) return state;

  return {
    value: state.value.slice(0, state.caret) + state.value.slice(state.caret + 1),
    caret: state.caret,
    anchor: state.caret,
    scrollX: state.scrollX,
  };
}

/** Paste: insert like {@link insertText} (separate for API clarity). */
export const paste = insertText;

/** Select-all. */
export function selectAll(state: TextInputState): TextInputState {
  return { ...state, caret: state.value.length, anchor: 0 };
}

export type CaretMove = "left" | "right" | "home" | "end";

/** Move the caret; shift extends the selection from the anchor. */
export function moveCaret(
  state: TextInputState,
  direction: CaretMove,
  shift: boolean
): TextInputState {
  const anchor = state.anchor;

  switch (direction) {
    case "left": {
      const caret = Math.max(0, state.caret - 1);
      return { ...state, caret, anchor: shift ? anchor : caret };
    }
    case "right": {
      const caret = Math.min(state.value.length, state.caret + 1);
      return { ...state, caret, anchor: shift ? anchor : caret };
    }
    case "home":
      return { ...state, caret: 0, anchor: shift ? anchor : 0 };
    case "end":
      return { ...state, caret: state.value.length, anchor: shift ? anchor : state.value.length };
  }
}

/** Cut: remove the selection and hand the text to the caller (clipboard). */
export function cut(state: TextInputState): {
  state: TextInputState;
  cutText: string | null;
} {
  const range = selectionRange(state);
  if (!range) return { state, cutText: null };

  return {
    state: {
      value: state.value.slice(0, range.start) + state.value.slice(range.end),
      caret: range.start,
      anchor: range.start,
      scrollX: state.scrollX,
    },
    cutText: state.value.slice(range.start, range.end),
  };
}

/** X-position of the caret for a proportional-width measure function. */
export function caretX(options: {
  value: string;
  caret: number;
  measure: (text: string) => number;
}): number {
  return options.measure(options.value.slice(0, options.caret));
}

/** Map a pointer x (content-relative) to a caret index. */
export function xToCaret(options: {
  value: string;
  /** Pointer x relative to the content box (scroll applied). */
  relX: number;
  measure: (text: string) => number;
}): number {
  const { value, relX, measure } = options;

  for (let i = 0; i < value.length; i++) {
    const mid = measure(value.slice(0, i + 1));
    if (relX < mid) {
      const prev = measure(value.slice(0, i));
      return relX - prev < mid - relX ? i : i + 1;
    }
  }

  return value.length;
}

/** Keep the caret visible post-move/insert. */
export function scrollXFor(options: {
  caretX: number;
  currentScrollX: number;
  visibleWidth: number;
}): number {
  return recomputeScrollX(options);
}
