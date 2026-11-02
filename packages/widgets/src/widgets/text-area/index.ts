/**
 * TextArea — multiline controlled text field. Net-new (flying-pan has
 * no TextArea); the web textarea is the spec: soft wrap, Enter inserts
 * a newline, Up/Down move by visual line with a remembered goal column,
 * click maps (x, y) → line → column, and the view scrolls to keep the
 * caret visible. Editing state is keyed by stableId and survives
 * re-renders (same model as TextInput); controlled `value` + onChange,
 * uncontrolled `defaultValue`.
 */
import {
  type BaseWidgetProps,
  disabledStyle,
  focusableWhen,
  focusStyle,
  KeyCode,
  KeyModifiers,
  Metrics,
  Palette,
  type ReconcilableWidget,
} from "@tsgui/core";
import { type ViewStyle, WidgetType } from "@tsgui/layout";
import { createWidget } from "../../create-widget.ts";
import { CaretDirection } from "../text-input/core.ts";
import { textInputClipboard } from "../text-input/state.ts";
import {
  backspace,
  deleteForward,
  insertText,
  moveCaret,
  scrollYFor,
  selectAll,
  selectedText,
  TEXT_LINE_ADVANCE,
  type TextAreaState,
  yToCaret,
} from "./core.ts";
import {
  deleteEditingState,
  editingStateOf,
  ensureLayout,
  writeEditingState,
} from "./state.ts";

export { editingStateOf };

const lineAdvanceOf = (style: TextAreaStyle | undefined): number =>
  style?.lineHeight ?? TEXT_LINE_ADVANCE;

export { resetTextAreaEditingStates } from "./state.ts";
export type { TextAreaState };

/** Text-area paint hints layered on ViewStyle. */
export interface TextAreaStyle extends ViewStyle {
  color?: string;
  placeholderColor?: string;
  caretColor?: string;
  selectionColor?: string;
  lineHeight?: number;
  _hover?: TextAreaStateStyle;
  _focus?: TextAreaStateStyle;
  _disabled?: TextAreaStateStyle;
}

/** Pseudo-state overrides for text areas. */
export interface TextAreaStateStyle {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export interface TextAreaProps extends BaseWidgetProps {
  /** Controlled text — wins over defaultValue. */
  value?: string;
  /** Uncontrolled initial text. */
  defaultValue?: string;
  onChange?(value: string): void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Glyph-accurate text width in px — drives wrap, click→caret, and
   * caret x. Defaults to an 8px-per-char estimate; inject the font's
   * measure for pixel-correct behavior.
   */
  measureText?(text: string): number;
  style?: TextAreaStyle;
  onUnmount?(payload: { widget: ReconcilableWidget; stableId: number }): void;
}

export function TextArea(props: TextAreaProps): ReconcilableWidget {
  const {
    value,
    onChange,
    placeholder,
    disabled,
    defaultValue,
    measureText,
    style,
    key,
    onPointerDown,
    onPointerMove,
    onKeyDown,
    onChar,
    onUnmount,
    ...handlers
  } = props;

  const isEditModifier = (m: KeyModifiers): boolean =>
    (m & (KeyModifiers.Meta | KeyModifiers.Control)) !== 0;

  const measureWidth = (text: string): number =>
    measureText?.(text) ?? text.length * 8;

  const stateOf = (payload: { stableId: number }): TextAreaState =>
    editingStateOf(payload.stableId, { value, defaultValue });

  /** Commit a new editing state; scroll the caret into view; report. */
  const applyEdit = (
    payload: { stableId: number },
    contentWidth: number,
    visibleLines: number,
    next: TextAreaState,
    valueChanged: boolean
  ): void => {
    const layout = ensureLayout(
      payload.stableId,
      next,
      contentWidth,
      measureWidth
    );
    const scrollY = scrollYFor({
      layout,
      caret: next.caret,
      scrollY: next.scrollY,
      visibleLines,
    });
    const finalized = { ...next, scrollY };
    writeEditingState(payload.stableId, finalized);

    if (valueChanged) onChange?.(finalized.value);
  };

  return createWidget({
    type: WidgetType.TextArea,
    props: {
      value,
      placeholder,
      disabled,
      // The painter needs the same measure the handlers use — without
      // it, highlights and the caret draw at the 8px estimate while the
      // text renders with real glyph widths.
      measureText,
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
      onUnmount: (payload: {
        widget: ReconcilableWidget;
        stableId: number;
      }) => {
        deleteEditingState(payload.stableId);
        onUnmount?.(payload);
      },
      onChar: (payload) => {
        onChar?.(payload);
        if (disabled) return;
        const state = stateOf(payload);
        const next = insertText(state, payload.text);
        applyEdit(
          payload,
          payload.node.width - Metrics.defaultPadding * 2,
          Math.max(
            1,
            Math.floor(
              (payload.node.height - Metrics.defaultPadding * 2) /
                lineAdvanceOf(style)
            )
          ),
          next,
          true
        );
      },
      onKeyDown: (payload) => {
        onKeyDown?.(payload);
        if (disabled) return;

        const state = stateOf(payload);
        const hasSelection = state.caret !== state.anchor;
        const editModifier = isEditModifier(payload.modifiers);
        const shift = (payload.modifiers & KeyModifiers.Shift) !== 0;

        const contentWidth = payload.node.width - Metrics.defaultPadding * 2;
        const visibleLines = Math.max(
          1,
          Math.floor(
            (payload.node.height - Metrics.defaultPadding * 2) /
              lineAdvanceOf(style)
          )
        );
        const layout = ensureLayout(
          payload.stableId,
          state,
          contentWidth,
          measureWidth
        );

        switch (payload.key) {
          // Real Enter arrives as a plain keydown (SDL never sends it as
          // a text-input event) — insert the newline here, not in onChar.
          case KeyCode.Enter: {
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              insertText(state, "\n"),
              true
            );
            return;
          }
          case KeyCode.Backspace: {
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              backspace(state),
              true
            );
            return;
          }
          case KeyCode.Delete: {
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              deleteForward(state),
              true
            );
            return;
          }
          case KeyCode.Left:
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              moveCaret(state, CaretDirection.Left, shift, layout),
              false
            );
            return;
          case KeyCode.Right:
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              moveCaret(state, CaretDirection.Right, shift, layout),
              false
            );
            return;
          case KeyCode.Up:
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              moveCaret(state, CaretDirection.Up, shift, layout),
              false
            );
            return;
          case KeyCode.Down:
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              moveCaret(state, CaretDirection.Down, shift, layout),
              false
            );
            return;
          case KeyCode.Home:
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              moveCaret(state, CaretDirection.Home, shift, layout),
              false
            );
            return;
          case KeyCode.End:
            applyEdit(
              payload,
              contentWidth,
              visibleLines,
              moveCaret(state, CaretDirection.End, shift, layout),
              false
            );
            return;
          case KeyCode.A:
            if (editModifier)
              applyEdit(
                payload,
                contentWidth,
                visibleLines,
                selectAll(state),
                false
              );
            return;
          case KeyCode.X:
            if (editModifier && hasSelection) {
              textInputClipboard.set(selectedText(state));
              applyEdit(
                payload,
                contentWidth,
                visibleLines,
                backspace(state),
                true
              );
            }
            return;
          case KeyCode.C:
            if (editModifier && hasSelection) {
              textInputClipboard.set(selectedText(state));
            }
            return;
          case KeyCode.V: {
            if (editModifier) {
              const text = textInputClipboard.get();
              if (text) {
                applyEdit(
                  payload,
                  contentWidth,
                  visibleLines,
                  insertText(state, text),
                  true
                );
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
        const layout = ensureLayout(
          payload.stableId,
          state,
          payload.node.width - Metrics.defaultPadding * 2,
          measureWidth
        );
        const caret = yToCaret({
          layout,
          relY:
            payload.y -
            payload.node.screenY -
            Metrics.defaultPadding +
            state.scrollY * lineAdvanceOf(style),
          lineAdvance: lineAdvanceOf(style),
          relX: payload.x - payload.node.screenX - Metrics.defaultPadding,
          measure: measureWidth,
        });
        writeEditingState(payload.stableId, {
          ...state,
          caret,
          anchor: caret,
          goalColumn: null,
        });
        payload.capturePointer?.();
      },
      onPointerMove: (payload) => {
        onPointerMove?.(payload);
        if (disabled || !payload.captured) return;

        // Drag extends the selection: anchor stays, caret follows.
        const state = stateOf(payload);
        const layout = ensureLayout(
          payload.stableId,
          state,
          payload.node.width - Metrics.defaultPadding * 2,
          measureWidth
        );
        const caret = yToCaret({
          layout,
          relY:
            payload.y -
            payload.node.screenY -
            Metrics.defaultPadding +
            state.scrollY * lineAdvanceOf(style),
          lineAdvance: lineAdvanceOf(style),
          relX: payload.x - payload.node.screenX - Metrics.defaultPadding,
          measure: measureWidth,
        });
        writeEditingState(payload.stableId, { ...state, caret });
      },
    },
  });
}
