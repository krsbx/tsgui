/**
 * Text line wrapping — the web `white-space: normal` model, computed at
 * layout-measure time so node width/height reflect the wrapped block and
 * paint never re-wraps (lines can't disagree with the measured height).
 *
 * Greedy word packing against an injected measure (LayoutContext
 * .measureText — TTF in production, stubs in tests). A word wider than
 * the constraint hard-breaks by characters. Lines are recorded per
 * widget descriptor in a frame cache: measurement runs during the
 * parent's layoutFlex pass and the entry is consumed when layoutFlex
 * builds that child's node — same frame, ordered, no cross-frame leaks
 * (the map holds WeakRefs; descriptors are rebuilt on re-render).
 */
import type { WidgetDescriptor } from "./style.ts";

/** Wrapped lines + the vertical advance each one occupies. */
export interface TextLayout {
  lines: string[];
  lineAdvance: number;
}

export interface WrapTextOptions {
  text: string;
  /** Width the lines must fit — caller resolves style + parent limits. */
  maxWidth: number;
  /** Intrinsic width of a candidate run. */
  measure(text: string): number;
}

const cache = new WeakMap<WidgetDescriptor, TextLayout>();

/** Store this frame's wrapped lines for a text widget. */
export function recordTextLayout(
  widget: WidgetDescriptor,
  layout: TextLayout
): void {
  cache.set(widget, layout);
}

/**
 * Consume the wrapped lines measured earlier this frame — get + delete,
 * so a descriptor that stops being measured can't keep stale lines.
 */
export function takeTextLayout(widget: WidgetDescriptor): TextLayout | null {
  const layout = cache.get(widget);
  if (!layout) return null;
  cache.delete(widget);
  return layout;
}

/** Greedy word wrap; single words wider than `maxWidth` hard-break. */
export function wrapText(options: WrapTextOptions): string[] {
  const { text, maxWidth, measure } = options;

  if (!text || maxWidth <= 0) return text ? [text] : [];

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [text];

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (measure(word) > maxWidth) {
      // Flush the current line, then hard-break the long word.
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const piece of breakWord({ word, maxWidth, measure })) {
        lines.push(piece);
      }
      continue;
    }

    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }

    lines.push(line);
    line = word;
  }

  if (line) lines.push(line);

  return lines.length > 0 ? lines : [text];
}

/** Character-level break for a single word wider than the constraint. */
function breakWord(options: {
  word: string;
  maxWidth: number;
  measure(text: string): number;
}): string[] {
  const { word, maxWidth, measure } = options;
  const pieces: string[] = [];
  let piece = "";

  for (const char of word) {
    const candidate = piece + char;
    if (piece && measure(candidate) > maxWidth) {
      pieces.push(piece);
      piece = char;
      continue;
    }
    piece = candidate;
  }

  if (piece) pieces.push(piece);

  return pieces.length > 0 ? pieces : [word];
}
