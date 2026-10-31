/**
 * Per-widget intrinsic size resolution. flying-pan read the font/texture
 * managers directly; here measurement is INJECTED via LayoutContext, which
 * is what makes this layer headless-testable.
 */
import { WidgetType } from "./enums.ts";
import { resolveSize } from "./style-resolve.ts";
import type { Size, WidgetDescriptor } from "./style.ts";
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
      resolveLabelSize({ widget, ctx: options.ctx, size });
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
  size: Size;
}): void {
  const text = options.widget.props["text"];
  if (typeof text !== "string" || !text) return;

  const measured = options.ctx.measureText(text, options.widget.style);
  options.size.width ||= measured.width;
  options.size.height ||= measured.height;
}
