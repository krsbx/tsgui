/**
 * Paint bridge — walks a LayoutNode tree and issues draw calls in
 * flying-pan's proven order: shadow → border → background → per-widget
 * painter → children. Per-widget painters live in ./paint/*.ts.
 *
 * The Painter surface is STRUCTURAL and reuses @tsgui/gpu's option types,
 * so GpuRenderer satisfies it while headless tests mock it.
 */
import type {
  ArcOptions,
  Rect,
  RectOptions,
  RingOptions,
  TextDrawOptions,
  TextureDrawOptions,
} from "@tsgui/gpu";
import type { Size } from "@tsgui/layout";
import { type LayoutNode, WidgetType } from "@tsgui/layout";
import { Palette } from "./design.ts";
import { paintCheckbox } from "./paint/checkbox.ts";
import { paintSliderBar } from "./paint/slider-bar.ts";
import { paintCircularSlider } from "./paint/circular-slider.ts";
import { paintTextInput } from "./paint/text-input.ts";
import {
  paintCircularProgress,
  paintProgressBar,
} from "./paint/progress/index.ts";
import { paintBackground, paintBorder } from "./paint/shape.ts";
import { paintShadow } from "./paint/shadow.ts";
import { paintMeter } from "./paint/meter.ts";
import { paintRadio } from "./paint/radio.ts";
import { paintToggle } from "./paint/toggle.ts";
import type { InteractionStates } from "./style-resolve.ts";
import { parseColor, resolveStyle } from "./style-resolve.ts";

/** The subset of GpuRenderer the paint walk consumes. */
export interface Painter {
  fillRect(opts: RectOptions): void;
  fillRoundedRect(opts: RectOptions & { radius: number }): void;
  fillArc(opts: ArcOptions): void;
  fillRing(opts: RingOptions): void;
  drawTexture(opts: TextureDrawOptions): void;
  /** Scissor clip for scrolled content (text fields). Optional for mocks. */
  pushClip?(clip: Rect): void;
  popClip?(): void;
}

export interface TextPainter {
  /** Queues a text run at x/y with the packed tint. */
  draw(gpu: Painter, opts: TextDrawOptions): void;
  /** Rendered size of a string — inline labels center with it. */
  measure?(text: string): Size;
}

export interface PaintContext {
  gpu: Painter;
  font: TextPainter;
  /** Per-node interaction flags — production wires the dispatch (phase 4). */
  statesOf?(node: LayoutNode): InteractionStates;
}

export { colorWithOpacity, parseColor, resolveStyle } from "./style-resolve.ts";
export type { InteractionStates };

/** Interaction states when no dispatch is wired — every flag off. */
const STATES_NONE: InteractionStates = {
  hovered: false,
  focused: false,
  pressed: false,
  checked: false,
  disabled: false,
};

/** Widgets whose checked flag comes from props (Radio uses `selected`). */
const CHECKED_PROP = new Map<WidgetType | (string & {}), string>([
  [WidgetType.Checkbox, "checked"],
  [WidgetType.Toggle, "checked"],
  [WidgetType.Radio, "selected"],
]);

function paintNode(ctx: PaintContext, node: LayoutNode): void {
  const base = node.widget.style ?? {};
  const states = ctx.statesOf?.(node) ?? STATES_NONE;

  // Controls carry their checked flag in props — fold it into the
  // pseudo-state so `_checked` style overrides apply.
  const checkedKey = CHECKED_PROP.get(node.widget.type);
  const checked = checkedKey ? node.widget.props[checkedKey] === true : false;
  const effectiveStates = checkedKey ? { ...states, checked } : states;

  const style = resolveStyle(base, effectiveStates);

  const rect: Rect = {
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
  };
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
          tint: parseColor(ts.color ?? Palette.text),
        });
      }
      break;
    }
    case WidgetType.Image: {
      // Descriptors carry the texture as an opaque prop; the paint bridge
      // trusts the app layer to store a real texture handle there.
      const texture = node.widget.props[
        "texture"
      ] as TextureDrawOptions["texture"];
      if (texture) {
        ctx.gpu.drawTexture({ texture, ...rect });
      }
      break;
    }
    case WidgetType.ProgressBar:
      paintProgressBar(ctx, node);
      break;
    case WidgetType.CircularProgress:
      paintCircularProgress(ctx, node);
      break;
    case WidgetType.Meter:
      paintMeter(ctx, node);
      break;
    case WidgetType.Checkbox:
      paintCheckbox(ctx, node, checked);
      break;
    case WidgetType.Toggle:
      paintToggle(ctx, node, checked);
      break;
    case WidgetType.Radio:
      paintRadio(ctx, node, checked);
      break;
    case WidgetType.SliderBar:
      paintSliderBar(ctx, node);
      break;
    case WidgetType.CircularSlider:
      paintCircularSlider(ctx, node);
      break;
    case WidgetType.TextInput:
      paintTextInput(ctx, node);
      break;
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
