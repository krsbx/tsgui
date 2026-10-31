/**
 * Paint bridge — walks the LayoutNode tree and issues draw calls on a
 * Painter (GpuRenderer satisfies this structurally; tests use a recorder).
 */
import type { TextStyle, ViewStyle } from "@tsgui/layout";
import { WidgetType, type LayoutNode } from "@tsgui/layout";

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
    segments?: number;
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
  draw(gpu: Painter, opts: { x: number; y: number; text: string; tint?: number }): void;
}

export interface PaintContext {
  gpu: Painter;
  font: TextPainter;
}

/**
 * Minimal CSS-color parsing for the style model's ValidColor strings:
 * #rgb, #rgba, #rrggbb, #rrggbbaa. Unknown strings render transparent
 * magenta so mistakes are visible instead of silent.
 */
export function parseColor(css: string): number {
  if (css === "transparent") return 0x00000000;

  let hex = css;
  if (!hex.startsWith("#")) {
    // Visible mistake color — fail loud at a glance, not silently black.
    return 0xff00ffff;
  }
  hex = hex.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length === 6) hex += "ff";

  if (hex.length !== 8) return 0xff00ffff;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = Number.parseInt(hex.slice(6, 8), 16);

  return (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}

function paintBackground(gpu: Painter, node: LayoutNode, style: ViewStyle): void {
  const { x, y, width, height } = node;

  if (style.borderRadius) {
    gpu.fillRoundedRect({
      x,
      y,
      w: width,
      h: height,
      radius: style.borderRadius,
      color: parseColor(style.backgroundColor ?? "transparent"),
    });
  } else if (style.backgroundColor) {
    gpu.fillRect({
      x,
      y,
      w: width,
      h: height,
      color: parseColor(style.backgroundColor),
    });
  }
}

function paintNode(ctx: PaintContext, node: LayoutNode): void {
  const style = node.widget.style ?? {};

  paintBackground(ctx.gpu, node, style);

  switch (node.widget.type) {
    case WidgetType.Label: {
      const text = node.widget.props["text"];
      if (typeof text === "string") {
        const color = (node.widget.style as TextStyle | undefined)?.color ?? "#eceef5";
        ctx.font.draw(ctx.gpu, {
          x: node.screenX,
          y: node.screenY,
          text,
          tint: parseColor(color),
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


