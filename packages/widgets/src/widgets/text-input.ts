/**
 * TextInput — single-line controlled text field. Ported from flying-pan's
 * widget/text-input. Editing state (caret/anchor/scrollX) is keyed by
 * stableId so it survives the re-renders every keystroke triggers; the
 * text itself is controlled — `value` + `onChange`, the batch 2
 * convention. The uncontrolled StateStore variant lands with the state
 * milestone.
 */
import { WidgetType, type ViewStyle } from "@tsgui/layout";
import { Metrics, Palette, disabledStyle, focusStyle, focusableWhen } from "../design.ts";
import { createWidget } from "../create-widget.ts";
import {
  backspace,
  CaretDirection,
  cut as cutText,
  deleteForward,
  insertText,
  makeTextInputState,
  moveCaret,
  scrollXFor,
  selectAll,
  type TextInputState,
  xToCaret,
} from "./text-input-core.ts";

export type { TextInputState };
import type { BaseWidgetProps } from "../types.ts";
import {
  KeyCode,
  KeyModifiers,
  type ReconcilableWidget,
} from "../types.ts";

/** Text-field paint hints layered on ViewStyle. */
export interface TextInputStyle extends ViewStyle {
  color?: string;
  placeholderColor?: string;
  caretColor?: string;
  selectionColor?: string;
  _hover?: TextInputStateStyle;
  _focus?: TextInputStateStyle;
  _disabled?: TextInputStateStyle;
}

/** Pseudo-state overrides for text fields (subset + own hints). */
export interface TextInputStateStyle extends ViewStyle {
  color?: string;
  placeholderColor?: string;
  caretColor?: string;
  selectionColor?: string;
}

export interface TextInputProps extends BaseWidgetProps {
  /** Controlled text. */
  value?: string;
  onChange?(value: string): void;
  placeholder?: string;
  disabled?: boolean;
  style?: TextInputStyle;
  onUnmount?(payload: { widget: ReconcilableWidget; stableId: number }): void;
}

/**
 * Editing state keyed by stableId — survives re-renders (every keystroke
 * rebuilds descriptors), released when the reconciler unmounts the widget
 * (onUnmount composes the user's hook).
 */
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

function writeEditingState(stableId: number, state: TextInputState): void {
  editingStates.set(stableId, state);
}

/** Clipboard seam — defaults to the SDL API, overridable in tests. */
export const textInputClipboard: { get(): string; set(text: string): void } = {
  get: () => "",
  set: () => {},
};

export function TextInput(props: TextInputProps): ReconcilableWidget {
  const {
    value,
    onChange,
    placeholder,
    disabled,
    style,
    key,
    onPointerDown,
    onPointerMove,
    onKeyDown,
    onKeyUp: userOnKeyUp,
    onChar,
    onUnmount,
    ...handlers
  } = props;

  // Accept Cmd (darwin convention) and Ctrl everywhere — most toolkits do.
  const isEditModifier = (m: KeyModifiers): boolean =>
    (m & (KeyModifiers.Meta | KeyModifiers.Control)) !== 0;

  const stateOf = (payload: { stableId: number }): TextInputState =>
    editingStateOf(payload.stableId, { value });

  const applyEdit = (
    payload: { stableId: number },
    node: { width: number },
    next: TextInputState,
    valueChanged: boolean
  ): void => {
    const visibleWidth = Math.max(0, node.width - Metrics.defaultPadding * 2);
    const measure = (text: string): number => text.length * 8;
    const scrollX = scrollXFor({
      caretX: measure(next.value.slice(0, next.caret)),
      currentScrollX: next.scrollX,
      visibleWidth,
    });
    const finalized = { ...next, scrollX };
    writeEditingState(payload.stableId, finalized);

    if (valueChanged) onChange?.(finalized.value);
  };

  return createWidget({
    type: WidgetType.TextInput,
    props: {
      value,
      placeholder,
      disabled,
    },
    style: {
      padding: Metrics.defaultPadding,
      borderRadius: Metrics.inputRadius,
      borderWidth: Metrics.borderWidth,
      borderColor: Palette.border,
      backgroundColor: Palette.surface,
      color: Palette.text,
      placeholderColor: Palette.textMuted,
      caretColor: Palette.text,
      selectionColor: Palette.selection,
      focusable: focusableWhen(disabled),
      ...style,
      _hover: {
        backgroundColor: Palette.surfaceHover,
        ...style?._hover,
      },
      _focus: focusStyle(style),
      _disabled: disabledStyle(style),
    },
    key,
    handlers: {
      ...handlers,
      onUnmount: (payload: { widget: ReconcilableWidget; stableId: number }) => {
        editingStates.delete(payload.stableId);
        onUnmount?.(payload);
      },
      onChar: (payload) => {
        onChar?.(payload);
        if (disabled) return;
        const state = stateOf(payload);
        const next = insertText(state, payload.text);
        applyEdit(payload, payload.node, next, true);
      },
      onKeyUp: (payload) => {
        userOnKeyUp?.(payload);
      },
      onKeyDown: (payload) => {
        onKeyDown?.(payload);
        if (disabled) return;

        const state = stateOf(payload);
        const range = { start: Math.min(state.caret, state.anchor), end: Math.max(state.caret, state.anchor) };
        const hasSelection = state.caret !== state.anchor;
        const editModifier = isEditModifier(payload.modifiers);
        const shift = (payload.modifiers & KeyModifiers.Shift) !== 0;

        switch (payload.key) {
          case KeyCode.Backspace: {
            const next = backspace(state);
            applyEdit(payload, payload.node, next, next.value !== state.value);
            return;
          }
          case KeyCode.Delete: {
            const next = deleteForward(state);
            applyEdit(payload, payload.node, next, next.value !== state.value);
            return;
          }
          case KeyCode.Left:
            applyEdit(payload, payload.node, moveCaret(state, CaretDirection.Left, shift), false);
            return;
          case KeyCode.Right:
            applyEdit(payload, payload.node, moveCaret(state, CaretDirection.Right, shift), false);
            return;
          case KeyCode.Home:
            applyEdit(payload, payload.node, moveCaret(state, CaretDirection.Home, shift), false);
            return;
          case KeyCode.End:
            applyEdit(payload, payload.node, moveCaret(state, CaretDirection.End, shift), false);
            return;
          case KeyCode.A:
            if (editModifier) applyEdit(payload, payload.node, selectAll(state), false);
            return;
          case KeyCode.X:
            if (editModifier && hasSelection) {
              textInputClipboard.set(state.value.slice(range.start, range.end));
              const next = cutText(state);
              applyEdit(payload, payload.node, next.state, true);
            }
            return;
          case KeyCode.V: {
            if (editModifier) {
              const text = textInputClipboard.get();
              if (text) {
                const next = insertText(state, text);
                applyEdit(payload, payload.node, next, true);
              }
            }
            return;
          }
          default:
            return;
        }
      },
      onPointerDown: (payload) => {
        onPointerDown?.(payload);
        if (disabled) return;

        const state = stateOf(payload);
        const caret = xToCaret({
          value: value ?? state.value,
          relX: payload.x - payload.node.screenX - Metrics.defaultPadding + state.scrollX,
          measure: (text) => text.length * 8,
        });
        const next = { ...state, caret, anchor: caret };
        writeEditingState(payload.stableId, next);
        payload.capturePointer?.();
      },
      onPointerMove: (payload) => {
        onPointerMove?.(payload);
        if (disabled || !payload.captured) return;

        // Drag extends the selection: anchor stays, caret follows.
        const state = stateOf(payload);
        const caret = xToCaret({
          value: value ?? state.value,
          relX: payload.x - payload.node.screenX - Metrics.defaultPadding + state.scrollX,
          measure: (text) => text.length * 8,
        });
        writeEditingState(payload.stableId, { ...state, caret });
      },
    },
  });
}