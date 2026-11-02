/**
 * TextArea edit core — pure operations over a `\n`-delimited value with
 * an absolute-index caret. Net-new (flying-pan has no TextArea); the
 * web textarea is the spec: soft wrap, selection spans lines, Up/Down
 * move by VISUAL line (through the wrap) with a remembered goal column,
 * click maps (x, y) → line → column.
 *
 * The wrap is VERBATIM: every visual line is an exact substring of the
 * value (words moved to the next line leave their trailing space at the
 * break), so a visual line's text maps losslessly back to caret indices
 * — `caret = line.start + column`, no normalization drift.
 */
import { CaretDirection, xToCaret } from "../text-input/core.ts";

/**
 * Default vertical advance per visual line — the painter AND the
 * handlers must use the same value (plus any style.lineHeight), or the
 * scroll math disagrees with what is on screen.
 */
export const TEXT_LINE_ADVANCE = 18;

export interface TextAreaState {
  value: string;
  caret: number;
  /** Selection anchor — caret === anchor means no selection. */
  anchor: number;
  /** Visual lines scrolled off the top (clamped on demand). */
  scrollY: number;
  /**
   * Column remembered while moving vertically so Up/Down keeps the
   * user's x even across shorter lines — reset by any horizontal
   * move, edit, or click (the web textarea's goal column).
   */
  goalColumn: number | null;
}

export function makeTextAreaState(props: { value?: string }): TextAreaState {
  return {
    value: props.value ?? "",
    caret: (props.value ?? "").length,
    anchor: (props.value ?? "").length,
    scrollY: 0,
    goalColumn: null,
  };
}

/** A visual (wrapped) line — verbatim substring of the value. */
export interface VisualLine {
  /** The line's text, exactly as it appears in the value. */
  text: string;
  /** Absolute index of the line's first character in the value. */
  start: number;
}

export interface TextAreaLayout {
  visual: VisualLine[];
}

/**
 * Soft-wrap the value into visual lines that fit `maxWidth`. Splits on
 * `\n` into logical lines, greedily packs each at word boundaries by
 * measuring EXACT substrings of the value, and hard-breaks words wider
 * than the line (same policy as layout's label wrap, but verbatim).
 */
export function layoutLines(options: {
  value: string;
  maxWidth: number;
  measure: (text: string) => number;
}): TextAreaLayout {
  const { value, maxWidth, measure } = options;

  const degenerate: VisualLine[] = [];
  if (maxWidth <= 0) {
    // Degenerate box — one visual line per logical line, no wrapping.
    let start = 0;
    for (const logical of value.split("\n")) {
      degenerate.push({ text: logical, start });
      start += logical.length + 1;
    }
    if (degenerate.length === 0) degenerate.push({ text: "", start: 0 });
    return { visual: degenerate };
  }

  const visual: VisualLine[] = [];

  let logicalStart = 0;
  for (const logical of value.split("\n")) {
    if (logical.length === 0) {
      visual.push({ text: "", start: logicalStart });
      logicalStart += 1;
      continue;
    }

    let pos = 0;
    while (pos < logical.length) {
      // Farthest word boundary that fits: scan word by word, measuring
      // exact substrings of the logical line (spaces included as-is).
      let lastFit = -1;
      let scan = pos;
      while (scan < logical.length) {
        while (scan < logical.length && logical[scan] !== " ") scan++;
        if (measure(logical.slice(pos, scan)) > maxWidth) break;
        lastFit = scan;
        while (scan < logical.length && logical[scan] === " ") scan++;
      }

      if (lastFit > pos) {
        // Emit, trimming the separator spaces carried at the end.
        let end = lastFit;
        while (end > pos && logical[end - 1] === " ") end--;
        visual.push({
          text: logical.slice(pos, end),
          start: logicalStart + pos,
        });
        pos = lastFit;
        while (pos < logical.length && logical[pos] === " ") pos++;
        continue;
      }

      // Nothing fit — a word wider than the box: hard-break by chars.
      let charEnd = pos + 1;
      while (charEnd < logical.length) {
        if (measure(logical.slice(pos, charEnd + 1)) > maxWidth) break;
        charEnd++;
      }
      visual.push({
        text: logical.slice(pos, charEnd),
        start: logicalStart + pos,
      });
      pos = charEnd;
    }

    logicalStart += logical.length + 1; // +1 for the `\n`
  }

  if (visual.length === 0) visual.push({ text: "", start: 0 });

  return { visual };
}

/** Absolute caret index → (visual line index, column within it). */
export function caretVisual(
  layout: TextAreaLayout,
  caret: number
): { index: number; column: number } {
  for (let i = layout.visual.length - 1; i >= 0; i--) {
    const line = layout.visual[i]!;
    if (caret >= line.start) {
      return {
        index: i,
        column: Math.min(caret - line.start, line.text.length),
      };
    }
  }
  return { index: 0, column: 0 };
}

/**
 * Click → caret: `relY` is pointer y relative to the content box with
 * scroll applied; the visual line under it is selected, then xToCaret
 * resolves the column within that line's verbatim text.
 */
export function yToCaret(options: {
  layout: TextAreaLayout;
  relY: number;
  lineAdvance: number;
  relX: number;
  measure: (text: string) => number;
}): number {
  const { layout, relY, lineAdvance, relX, measure } = options;

  const advance = Math.max(1, lineAdvance);
  const index = Math.max(
    0,
    Math.min(layout.visual.length - 1, Math.floor(relY / advance))
  );
  const line = layout.visual[index]!;

  const column =
    line.text.length === 0
      ? 0
      : Math.min(
          line.text.length,
          xToCaret({ value: line.text, relX, measure })
        );

  return line.start + column;
}

/** The caret's line is scrolled into the visible band. */
export function scrollYFor(options: {
  layout: TextAreaLayout;
  caret: number;
  scrollY: number;
  visibleLines: number;
}): number {
  const { layout, caret, scrollY, visibleLines } = options;
  const { index } = caretVisual(layout, caret);
  const maxScroll = Math.max(0, layout.visual.length - visibleLines);

  let next = scrollY;
  if (index < next) next = index;
  if (index >= next + visibleLines) next = index - visibleLines + 1;
  return Math.max(0, Math.min(next, maxScroll));
}

const selectionRange = (
  state: TextAreaState
): { start: number; end: number } => ({
  start: Math.min(state.caret, state.anchor),
  end: Math.max(state.caret, state.anchor),
});

/** Insert text at the caret (replacing any selection). `\r` normalizes. */
export function insertText(state: TextAreaState, text: string): TextAreaState {
  const { start, end } = selectionRange(state);
  const normalized = text.replace(/\r\n?/g, "\n");
  const value =
    state.value.slice(0, start) + normalized + state.value.slice(end);
  const caret = start + normalized.length;
  return {
    ...state,
    value,
    caret,
    anchor: caret,
    scrollY: 0,
    goalColumn: null,
  };
}

export function backspace(state: TextAreaState): TextAreaState {
  const { start, end } = selectionRange(state);
  if (start !== end) {
    const value = state.value.slice(0, start) + state.value.slice(end);
    return {
      ...state,
      value,
      caret: start,
      anchor: start,
      scrollY: 0,
      goalColumn: null,
    };
  }
  if (start === 0) return state;
  const value = state.value.slice(0, start - 1) + state.value.slice(start);
  return {
    ...state,
    value,
    caret: start - 1,
    anchor: start - 1,
    scrollY: 0,
    goalColumn: null,
  };
}

export function deleteForward(state: TextAreaState): TextAreaState {
  const { start, end } = selectionRange(state);
  if (start !== end) {
    const value = state.value.slice(0, start) + state.value.slice(end);
    return {
      ...state,
      value,
      caret: start,
      anchor: start,
      scrollY: 0,
      goalColumn: null,
    };
  }
  if (end >= state.value.length) return state;
  const value = state.value.slice(0, end) + state.value.slice(end + 1);
  return {
    ...state,
    value,
    caret: start,
    anchor: start,
    scrollY: 0,
    goalColumn: null,
  };
}

/** Move the caret one direction; shift extends the selection. */
export function moveCaret(
  state: TextAreaState,
  direction: CaretDirection,
  shift: boolean,
  layout: TextAreaLayout
): TextAreaState {
  // Without shift the anchor collapses to the NEW caret (the selection
  // clears) — pinning it to the pre-move caret leaves an invisible
  // selection that the next insert silently replaces.
  const collapse = (caret: number): TextAreaState => ({
    ...state,
    caret,
    anchor: shift ? state.anchor : caret,
  });

  switch (direction) {
    case CaretDirection.Left: {
      const caret = Math.max(0, state.caret - 1);
      return { ...collapse(caret), goalColumn: null };
    }
    case CaretDirection.Right: {
      const caret = Math.min(state.value.length, state.caret + 1);
      return { ...collapse(caret), goalColumn: null };
    }
    case CaretDirection.Home: {
      const { index } = caretVisual(layout, state.caret);
      return {
        ...collapse(layout.visual[index]!.start),
        goalColumn: null,
      };
    }
    case CaretDirection.End: {
      const { index } = caretVisual(layout, state.caret);
      const line = layout.visual[index]!;
      return {
        ...collapse(line.start + line.text.length),
        goalColumn: null,
      };
    }
    case CaretDirection.Up:
    case CaretDirection.Down: {
      const { index, column } = caretVisual(layout, state.caret);
      const goal = state.goalColumn ?? column;
      const target =
        direction === CaretDirection.Up
          ? Math.max(0, index - 1)
          : Math.min(layout.visual.length - 1, index + 1);

      // Already at the edge — browsers snap to the line's start (Up) or
      // end (Down) instead of re-walking the same line.
      if (target === index) {
        const line = layout.visual[index]!;
        const caret =
          direction === CaretDirection.Up
            ? line.start
            : line.start + line.text.length;
        return { ...collapse(caret), goalColumn: null };
      }

      const line = layout.visual[target]!;
      const caret = line.start + Math.min(goal, line.text.length);
      return { ...collapse(caret), goalColumn: goal };
    }
    default:
      return state;
  }
}

/** Select everything (Ctrl/Cmd+A). */
export function selectAll(state: TextAreaState): TextAreaState {
  return { ...state, caret: state.value.length, anchor: 0, goalColumn: null };
}

/** The selection's text (Ctrl/Cmd+X/C). */
export function selectedText(state: TextAreaState): string {
  const { start, end } = selectionRange(state);
  return state.value.slice(start, end);
}
