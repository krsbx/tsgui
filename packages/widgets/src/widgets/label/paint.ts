/** Inline value labels — flying-pan's renderer/paint/text value branch. */
import { Palette } from "@tsgui/core";
import { ProgressValueType, type TextStyle } from "@tsgui/layout";
import {
  type Painter,
  parseColor,
  type TextPainter,
  type WidgetPainter,
} from "@tsgui/paint";

/** Auto label from a value; `null` when there's nothing to show. */
export function formatValueLabel(options: {
  value?: number;
  min?: number;
  max?: number;
  format?: ProgressValueType;
}): string | null {
  const { value, min, max, format } = options;

  if (format === undefined || value === undefined) return null;

  const lo = min ?? 0;
  const hi = max ?? 1;
  const span = hi - lo;
  const ratio = span === 0 ? 0 : (value - lo) / span;

  if (format === ProgressValueType.Percent) {
    return `${Math.round(ratio * 100)}%`;
  }

  return `${value}/${hi}`;
}

export interface InlineValueLabelOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Explicit text — wins over `showValue`. */
  label?: string;
  labelStyle?: TextStyle;
  value?: number;
  min?: number;
  max?: number;
  showValue?: ProgressValueType;
}

/** Text centered on a widget's box (progress fills, meters). */
export function paintInlineValueLabel(
  gpu: Painter,
  font: TextPainter,
  options: InlineValueLabelOptions
): void {
  const text = options.label ?? formatValueLabel(options);
  if (!text) return;

  const measured = font.measure?.(text) ?? {
    width: text.length * 8,
    height: 18,
  };

  font.draw(gpu, {
    x: options.x + (options.w - measured.width) / 2,
    y: options.y + (options.h - measured.height) / 2,
    text,
    tint: parseColor(options.labelStyle?.color ?? Palette.text),
  });
}

/**
 * Label painter — the walk's text case, registered per widget type.
 * Wrapped labels (layout recorded node.textLayout) draw one run per
 * line at the line advance; unwrapped labels draw a single run. A
 * `font` prop resolves through the context lookup — absent lookup
 * falls back to the default font (headless compat); a present lookup
 * with an unknown name fails loud (flying-pan semantics).
 */
export const paintLabel: WidgetPainter = (ctx, node, style) => {
  const text = node.widget.props["text"];
  if (typeof text !== "string") return;

  const fontProp = node.widget.props["font"];
  const font =
    typeof fontProp === "string"
      ? (ctx.fonts?.(fontProp) ?? ctx.font)
      : ctx.font;

  const tint = parseColor((style as { color?: string }).color ?? Palette.text);

  if (node.textLayout) {
    const { lines, lineAdvance } = node.textLayout;
    for (const [i, line] of lines.entries()) {
      font.draw(ctx.gpu, {
        x: node.screenX,
        y: node.screenY + i * lineAdvance,
        text: line,
        tint,
      });
    }
    return;
  }

  font.draw(ctx.gpu, { x: node.screenX, y: node.screenY, text, tint });
};
