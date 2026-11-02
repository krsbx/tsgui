/**
 * TextArea painter — the live editing state (peekEditingState, no
 * controlled reconciliation — same paint-lag rule as TextInput), soft
 * wrapped into visual lines clipped to the field. Selection highlights
 * span wrapped lines; the caret blinks on the animation clock;
 * placeholder shows when empty.
 */
import { Metrics, Palette, propsOf } from "@tsgui/core";
import { parseColor, type WidgetPainter } from "@tsgui/paint";
import { caretVisual, TEXT_LINE_ADVANCE } from "./core.ts";
import type { TextAreaProps } from "./index.ts";
import { ensureLayout, peekEditingState } from "./state.ts";

export const paintTextArea: WidgetPainter = (ctx, node, style) => {
  const props = propsOf<TextAreaProps>(node.widget);
  const state = peekEditingState(node.stableId, {
    value: props.value,
    defaultValue: props.defaultValue,
  });

  const pad = Metrics.defaultPadding;
  const contentX = node.screenX + pad;
  const contentY = node.screenY + pad;
  const contentW = Math.max(0, node.width - pad * 2);
  const contentH = Math.max(0, node.height - pad * 2);
  if (contentW <= 0 || contentH <= 0) return;

  const measure = (text: string): number =>
    props.measureText?.(text) ?? text.length * 8;

  const layout = ensureLayout(node.stableId, state, contentW, measure);

  const hasValue = state.value.length > 0;
  const focused = ctx.statesOf?.(node)?.focused ?? false;

  // Same advance the handlers use — consulting the runtime font here
  // made the paint see fewer lines than the scroll math (the dashboard
  // showed 3 lines where the handler tracked 4).
  const lineAdvance =
    (style as { lineHeight?: number }).lineHeight ?? TEXT_LINE_ADVANCE;
  const visible = Math.max(1, Math.floor(contentH / lineAdvance));

  const styleColor = style as {
    color?: string;
    placeholderColor?: string;
    caretColor?: string;
    selectionColor?: string;
  };

  ctx.gpu.pushClip?.({
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
  });

  const tint = parseColor(
    hasValue
      ? (styleColor.color ?? Palette.text)
      : (styleColor.placeholderColor ?? Palette.textMuted)
  );

  const selStart = Math.min(state.anchor, state.caret);
  const selEnd = Math.max(state.anchor, state.caret);
  const selectionTint = parseColor(
    styleColor.selectionColor ?? Palette.selection
  );

  // Placeholder only when the field is EMPTY — painted once, on the
  // first visible row. Empty lines inside real content (Enter on an
  // empty field, blank lines between paragraphs) draw nothing; the old
  // per-line fallback re-painted the placeholder on every blank line.

  for (let row = 0; row < visible; row++) {
    const line = layout.visual[state.scrollY + row];
    if (!line) break;

    const y = contentY + row * lineAdvance;

    // Selection highlight for this line's intersection with the range.
    if (selStart !== selEnd) {
      const from = Math.max(selStart, line.start);
      const to = Math.min(selEnd, line.start + line.text.length);
      if (to > from) {
        const prefix = line.text.slice(0, from - line.start);
        const selected = line.text.slice(from - line.start, to - line.start);
        ctx.gpu.fillRect({
          x: contentX + measure(prefix),
          y,
          w: measure(selected),
          h: lineAdvance,
          color: selectionTint,
        });
      }
    }

    if (!hasValue) {
      if (row === 0 && props.placeholder) {
        ctx.font.draw(ctx.gpu, {
          x: contentX,
          y: contentY,
          text: props.placeholder,
          tint,
        });
      }
      continue;
    }

    if (line.text.length > 0) {
      ctx.font.draw(ctx.gpu, { x: contentX, y, text: line.text, tint });
    }
  }

  // Caret — a 1px bar on the caret's visual line, blink gated by the
  // animation clock; without a manager it stays visible (deterministic
  // headless tests).
  if (focused) {
    const time = ctx.animationManager?.time;
    const blinkVisible = time === undefined || Math.floor(time / 500) % 2 === 0;

    const { index, column } = caretVisual(layout, state.caret);
    const row = index - state.scrollY;

    if (blinkVisible && row >= 0 && row < visible) {
      const line = layout.visual[index]!;
      ctx.gpu.fillRect({
        x: contentX + measure(line.text.slice(0, column)),
        y: contentY + row * lineAdvance,
        w: 1,
        h: lineAdvance,
        color: parseColor(styleColor.caretColor ?? Palette.text),
      });
    }
  }

  ctx.gpu.popClip?.();
};
