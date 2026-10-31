/**
 * Paint bridge — walks a LayoutNode tree and issues draw calls in
 * flying-pan's proven order: shadow → border → background → per-widget
 * painter → children. Phase 4's dispatch feeds real interaction states.
 */
import { WidgetType, type LayoutNode, type ViewStyle } from "@tsgui/layout";
import {
  colorWithOpacity,
  parseColor,
  resolveStyle,
  type InteractionStates,
} from "./style-resolve.ts";

/** The subset of GpuRenderer the paint walk consumes. */
export interface Painter {
  fillRect(opts: { x: number; y: number; w: number; h: number; color: number }): void;
  fillRoundedRect(opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    color: number;
  }): void;
  drawTexture(opts: {
    texture: unknown;
    x: number;
    y: number;
    w: number;
    h: number;
    tint?: number;
  }): void;
}

export interface TextPainter {
  /** Queues a text run at x/y with the packed tint. */
  draw(
    gpu: Painter,
    opts: { x: number; y: number; text: string; tint?: number }
  ): void;
}

export interface PaintContext {
  gpu: Painter;
  font: TextPainter;
  /** Per-node interaction flags — production wires the dispatch (phase 4). */
  statesOf?(node: LayoutNode): InteractionStates;
}

export { parseColor, colorWithOpacity, resolveStyle } from "./style-resolve.ts";
export type { InteractionStates };

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Stacked rounded-rect layers approximate the Gaussian falloff with the
 * existing primitive (flying-pan's documented approach — a Renderer-level
 * blur lands with the SDF pass).
 */
function paintShadow(
  gpu: Painter,
  rect: Rect,
  style: ViewStyle,
  radius: number | undefined
): void {
  if (!style.boxShadow) return;

  const shadows = Array.isArray(style.boxShadow) ? style.boxShadow : [style.boxShadow];

  for (const shadow of shadows) {
    const blur = shadow.blur ?? 0;
    const spread = shadow.spread ?? 0;
    const layers = 3;
    const color = parseColor(shadow.color);

    for (let i = layers; i >= 1; i--) {
      const grow = (blur + spread) * (i / layers);
      gpu.fillRoundedRect({
        x: rect.x + (shadow.x ?? 0) - grow,
        y: rect.y + (shadow.y ?? 0) - grow,
        w: rect.w + grow * 2,
        h: rect.h + grow * 2,
        // Layers stay concentric with the source rect's corners.
        radius: (radius ?? 0) + grow,
        color: colorWithOpacity(color, i / layers),
      });
    }
  }
}

/** Fill-only ring: a slightly larger shape in the border color, painted first. */
function paintBorder(
  gpu: Painter,
  rect: Rect,
  style: ViewStyle,
  radius: number | undefined
): void {
  const bw = style.borderWidth;
  if (!bw || !style.borderColor) return;

  const color = parseColor(style.borderColor);
  if (radius && radius > 0) {
    gpu.fillRoundedRect({
      x: rect.x - bw / 2,
      y: rect.y - bw / 2,
      w: rect.w + bw,
      h: rect.h + bw,
      radius: radius + bw / 2,
      color,
    });
  } else {
    gpu.fillRect({
      x: rect.x - bw / 2,
      y: rect.y - bw / 2,
      w: rect.w + bw,
      h: rect.h + bw,
      color,
    });
  }
  // The background paints over the inner half of the border — net stroke = bw/2.
}

function paintBackground(gpu: Painter, rect: Rect, style: ViewStyle, radius: number | undefined): void {
  if (!style.backgroundColor) return;

  const color = colorWithOpacity(parseColor(style.backgroundColor), style.opacity ?? 1);
  if (radius && radius > 0) {
    gpu.fillRoundedRect({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, radius, color });
  } else {
    gpu.fillRect({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, color });
  }
}

function paintNode(ctx: PaintContext, node: LayoutNode): void {
  const base = node.widget.style ?? {};
  const states = ctx.statesOf?.(node) ?? {
    hovered: false,
    focused: false,
    pressed: false,
    checked: false,
    disabled: false,
  };
  const style = resolveStyle(base, states);

  const rect = { x: node.screenX, y: node.screenY, w: node.width, h: node.height };
  const radius = style.borderRadius;

  paintShadow(ctx.gpu, rect, style, radius);
  paintBorder(ctx.gpu, rect, style, radius);
  paintBackground(ctx.gpu, rect, style, radius);

  switch (node.widget.type) {
    case WidgetType.Label: {
      const text = node.widget.props["text"];
      if (typeof text === "string") {
        const ts = style as { color?: string };
        ctx.font.draw(ctx.gpu, {
          x: node.screenX,
          y: node.screenY,
          text,
          tint: parseColor(ts.color ?? "#1f2937"),
        });
      }
      break;
    }
    case WidgetType.Image: {
      const texture = node.widget.props["texture"];
      if (texture) {
        ctx.gpu.drawTexture({
          texture,
          x: node.screenX,
          y: node.screenY,
          w: node.width,
          h: node.height,
        });
      }
      break;
    }
    default:
      break;
  }

  for (const child of node.children) {
    paintNode(ctx, child);
  }
}

/** Paint a laid-out tree in pre-order. */
export function paintTree(ctx: PaintContext, root: LayoutNode): void {
  paintNode(ctx, root);
}
