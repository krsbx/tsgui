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
import {
  type InteractionStates,
  Palette,
  STATES_NONE,
  type StateStore,
} from "@tsgui/core";
import type { Size } from "@tsgui/layout";
import { type LayoutNode, Overflow, WidgetType } from "@tsgui/layout";
import { paintCheckbox } from "./paint/checkbox.ts";
import { paintCircularSlider } from "./paint/circular-slider.ts";
import { paintMeter } from "./paint/meter.ts";
import {
  paintCircularProgress,
  paintProgressBar,
} from "./paint/progress/index.ts";
import { paintRadio } from "./paint/radio.ts";
import { paintShadow } from "./paint/shadow.ts";
import { paintBackground, paintBorder } from "./paint/shape.ts";
import { paintSliderBar } from "./paint/slider-bar.ts";
import { paintTextInput } from "./paint/text-input.ts";
import { paintToggle } from "./paint/toggle.ts";
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
  /** The app's state store — uncontrolled widgets resolve values here. */
  stateStore?: StateStore;
}

export { colorWithOpacity, parseColor, resolveStyle } from "./style-resolve.ts";
export type { InteractionStates };

/** Widgets whose checked flag comes from props (Radio uses `selected`). */
const CHECKED_PROP = new Map<WidgetType | (string & {}), string>([
  [WidgetType.Checkbox, "checked"],
  [WidgetType.Toggle, "checked"],
  [WidgetType.Radio, "selected"],
]);

function resolveChecked(
  ctx: PaintContext,
  node: LayoutNode,
  checkedKey: string | undefined
): boolean {
  if (!checkedKey) return false;

  const props = node.widget.props;
  const controlled = props[checkedKey];
  if (controlled !== undefined) return controlled === true;

  // Uncontrolled: the store-backed boolean at the node's stableId
  // (checkbox/toggle), or the named group value (radio).
  if (!ctx.stateStore) return false;

  if (checkedKey === "selected") {
    const name =
      typeof props["name"] === "string" ? (props["name"] as string) : "";
    if (!name) return false;
    const groupDefault =
      typeof props["groupDefaultValue"] === "string"
        ? (props["groupDefaultValue"] as string)
        : "";
    return (
      ctx.stateStore.stateForByName({ name, initial: groupDefault }) ===
      props["value"]
    );
  }

  return ctx.stateStore.stateFor<boolean>({
    stableId: node.stableId,
    initial: props["defaultChecked"] === true,
  });
}

function paintNode(ctx: PaintContext, node: LayoutNode): void {
  const base = node.widget.style ?? {};
  const states = ctx.statesOf?.(node) ?? STATES_NONE;

  // Controls resolve their checked flag: controlled props first, then
  // the store-backed uncontrolled state. Folded into the pseudo-state
  // so `_checked` style overrides apply.
  const checkedKey = CHECKED_PROP.get(node.widget.type);
  const checked = resolveChecked(ctx, node, checkedKey);
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

  // Scrollable containers clip their children — layout already shifted
  // them by the committed scroll offset (screenX/screenY), so clipping
  // this box is what makes the offset visible.
  const scrollable =
    style.overflow === Overflow.Scroll || style.overflow === Overflow.Auto;

  if (scrollable) {
    ctx.gpu.pushClip?.(rect);
  }
  for (const child of node.children) {
    paintNode(ctx, child);
  }
  if (scrollable) {
    ctx.gpu.popClip?.();
  }
}

/** Paint a laid-out tree in pre-order. */
export function paintTree(ctx: PaintContext, root: LayoutNode): void {
  paintNode(ctx, root);
}
