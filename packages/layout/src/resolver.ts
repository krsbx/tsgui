/**
 * Per-widget intrinsic size resolution. flying-pan read the font/texture
 * managers directly; here measurement is INJECTED via LayoutContext, which
 * is what makes this layer headless-testable.
 */
import { TextWrap, WidgetType } from "./enums.ts";
import { resolveConstraint, resolveSize } from "./style-resolve.ts";
import type { Size, TextStyle, WidgetDescriptor } from "./style.ts";
import { recordTextLayout, wrapText } from "./text-wrap.ts";
import type { LayoutContext } from "./types.ts";

export interface ResolveChildSizeOptions {
  widget: WidgetDescriptor;
  ctx: LayoutContext;
  parentWidth: number;
  parentHeight: number;
}

export function resolveChildSize(options: ResolveChildSizeOptions): Size {
  const { widget, parentHeight, parentWidth } = options;

  const size = {
    width: resolveSize(widget.style?.width, parentWidth),
    height: resolveSize(widget.style?.height, parentHeight),
  };

  switch (widget.type) {
    case WidgetType.Image:
      resolveImageSize({ widget, size });
      break;

    case WidgetType.Label:
    case WidgetType.Button:
      resolveLabelSize({
        widget,
        ctx: options.ctx,
        parentWidth,
        size,
      });
      break;

    case WidgetType.TextInput:
      resolveTextInputSize({ widget, ctx: options.ctx, size });
      break;

    default:
      break;
  }

  return size;
}

function resolveImageSize(options: {
  widget: WidgetDescriptor;
  size: Size;
}): void {
  // Explicit style dimensions win; otherwise intrinsic decoded size.
  if (options.size.width || options.size.height) return;

  const src = options.widget.props["src"];
  if (typeof src !== "string") return;

  const info = options.widget.props["imageSize"] as Size | null | undefined;
  if (info) {
    options.size.width ||= (propsWidth(options.widget) || info.width) ?? 0;
    options.size.height ||= (propsHeight(options.widget) || info.height) ?? 0;
  }
}

function propsWidth(widget: WidgetDescriptor): number | undefined {
  const w = widget.props["width"];
  return typeof w === "number" ? w : undefined;
}

function propsHeight(widget: WidgetDescriptor): number | undefined {
  const h = widget.props["height"];
  return typeof h === "number" ? h : undefined;
}

/** Text fields size to their value (or placeholder) + generous padding. */
function resolveTextInputSize(options: {
  widget: WidgetDescriptor;
  ctx: LayoutContext;
  size: Size;
}): void {
  const text =
    (typeof options.widget.props["value"] === "string"
      ? (options.widget.props["value"] as string)
      : "") ||
    (typeof options.widget.props["placeholder"] === "string"
      ? (options.widget.props["placeholder"] as string)
      : "");
  if (!text) return;

  const measured = options.ctx.measureText(text, options.widget.style);
  options.size.width ||= measured.width + 32; // padding + caret room
  options.size.height ||= measured.height + 16;
}

function resolveLabelSize(options: {
  widget: WidgetDescriptor;
  ctx: LayoutContext;
  parentWidth: number;
  size: Size;
}): void {
  const { widget, ctx, parentWidth, size } = options;
  const text = widget.props["text"];
  if (typeof text !== "string" || !text) return;

  // Label style is a TextStyle (textWrap/lineHeight); the descriptor's
  // ViewStyle typing is the generic container view.
  const style = (widget.style ?? {}) as TextStyle;
  const fontName =
    typeof widget.props["font"] === "string"
      ? (widget.props["font"] as string)
      : undefined;
  const measured = ctx.measureText(text, style, fontName);
  // Dimensions the caller left unset are intrinsic — measurement fills
  // them; explicit style.width/height always win.
  const widthIsIntrinsic = size.width === 0;
  const heightIsIntrinsic = size.height === 0;
  if (widthIsIntrinsic) size.width = measured.width;
  if (heightIsIntrinsic) size.height = measured.height;

  // Web text model: overlong text fills the available width and wraps.
  // The constraint is the parent content width (∩ an explicit maxWidth).
  if (
    style.textWrap === TextWrap.NoWrap ||
    parentWidth <= 0 ||
    measured.width <= parentWidth
  ) {
    return;
  }

  const maxWidth = resolveConstraint(style.maxWidth, parentWidth);
  const constraint = Math.min(parentWidth, maxWidth ?? parentWidth);
  if (measured.width <= constraint) return;

  const lineAdvance = style.lineHeight ?? measured.height;
  const lines = wrapText({
    text,
    maxWidth: constraint,
    measure: (candidate) => ctx.measureText(candidate, style, fontName).width,
  });

  if (widthIsIntrinsic) size.width = constraint;
  if (heightIsIntrinsic) size.height = lines.length * lineAdvance;
  recordTextLayout(widget, { lines, lineAdvance });
}
