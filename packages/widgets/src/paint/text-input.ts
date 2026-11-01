/** TextInput painter — selection, text/placeholder, caret. */
import type { LayoutNode } from "@tsgui/layout";
import { Metrics, Palette } from "../design.ts";
import type { PaintContext } from "../paint.ts";
import { parseColor } from "../style-resolve.ts";
import { propsOf } from "../types.ts";
import type { TextInputProps } from "../widgets/text-input/index.ts";
import { peekEditingState } from "../widgets/text-input/state.ts";

export function paintTextInput(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<TextInputProps>(node.widget);
  const style = node.widget.style ?? {};
  const focused = ctx.statesOf?.(node)?.focused ?? false;

  // Live editing state — NOT the controlled resync. The paint pass runs
  // on the previous frame's descriptor, whose props.value lags the edits
  // made earlier this frame; adopting it would revert the keystroke and
  // clamp the caret to 0.
  const state = peekEditingState(node.stableId, {
    value: props.value,
    defaultValue: props.defaultValue,
  });
  const value = state.value;

  const hasValue = value.length > 0;
  const text = hasValue ? value : (props.placeholder ?? "");
  if (!text) return;

  // The painter measures per character via the injected font.
  const measure = (sub: string): number =>
    ctx.font.measure?.(sub)?.width ?? sub.length * 8;
  const textHeight = ctx.font.measure?.("H")?.height ?? 18;

  const padLeft = Metrics.defaultPadding;
  const contentX = node.screenX + padLeft - state.scrollX;
  const contentY = node.screenY + (node.height - textHeight) / 2;

  // Clip to the field — scrolled text must not leak outside the box.
  ctx.gpu.pushClip?.({
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
  });
  // Selection highlight under the text.
  if (hasValue && state.caret !== state.anchor) {
    const start = Math.min(state.caret, state.anchor);
    const end = Math.max(state.caret, state.anchor);
    const startX = contentX + measure(value.slice(0, start));
    const endX = contentX + measure(value.slice(0, end));
    const styleSel = style as { selectionColor?: string };

    ctx.gpu.fillRect({
      x: startX,
      y: contentY,
      w: endX - startX,
      h: textHeight,
      color: parseColor(styleSel.selectionColor ?? Palette.selection),
    });
  }

  // Text or placeholder.
  const styleColor = style as { color?: string; placeholderColor?: string };
  ctx.font.draw(ctx.gpu, {
    x: contentX,
    y: contentY,
    text,
    tint: parseColor(
      hasValue
        ? (styleColor.color ?? Palette.text)
        : (styleColor.placeholderColor ?? Palette.textMuted)
    ),
  });

  // Caret — a 1px bar when focused. Blinking lands with the
  // AnimationManager (needs a clock; static is honest meanwhile).
  if (focused) {
    const styleCaret = style as { caretColor?: string };
    ctx.gpu.fillRect({
      x: contentX + measure(value.slice(0, state.caret)),
      y: contentY,
      w: 1,
      h: textHeight,
      color: parseColor(styleCaret.caretColor ?? Palette.text),
    });
  }

  ctx.gpu.popClip?.();
}
