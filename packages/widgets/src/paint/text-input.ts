/** TextInput painter — selection, text/placeholder, caret. */
import { Metrics, Palette } from "../design.ts";
import { parseColor } from "../style-resolve.ts";
import type { PaintContext } from "../paint.ts";
import { propsOf } from "../types.ts";
import type { TextInputProps } from "../widgets/text-input.ts";
import { editingStateOf } from "../widgets/text-input-state.ts";
import type { LayoutNode } from "@tsgui/layout";

export function paintTextInput(ctx: PaintContext, node: LayoutNode): void {
  const props = propsOf<TextInputProps>(node.widget);
  const style = node.widget.style ?? {};
  const focused = ctx.statesOf?.(node)?.focused ?? false;

  const state = editingStateOf(node.stableId, { value: props.value });
  const value = props.value ?? state.value;

  const hasValue = value.length > 0;
  const text = hasValue ? value : (props.placeholder ?? "");
  if (!text) return;

  // The painter measures per character via the injected font.
  const measure = (sub: string): number => ctx.font.measure?.(sub)?.width ?? sub.length * 8;
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
