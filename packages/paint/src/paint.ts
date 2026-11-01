/**
 * @tsgui/paint — the generic rendering engine. Walks a LayoutNode tree
 * and issues draw calls in flying-pan's proven order: shadow → border →
 * background → per-widget painter → children.
 *
 * The engine is widget-agnostic: per-widget painters are injected through
 * `PaintContext.painters` (assembled by @tsgui/widgets, which co-locates
 * each painter with its widget). The Painter surface is STRUCTURAL and
 * reuses @tsgui/gpu's option types, so GpuRenderer satisfies it while
 * headless tests mock it.
 */
import type { AnimationManager } from "@tsgui/animation";
import {
  type InteractionStates,
  STATES_NONE,
  type StateStore,
} from "@tsgui/core";
import type {
  ArcOptions,
  Rect,
  RectOptions,
  RingOptions,
  TextDrawOptions,
  TextureDrawOptions,
} from "@tsgui/gpu";
import type { Size, ViewStyle } from "@tsgui/layout";
import { type LayoutNode, Overflow, WidgetType } from "@tsgui/layout";
import { paintShadow } from "./primitives/shadow.ts";
import { paintBackground, paintBorder } from "./primitives/shape.ts";
import { resolveStyle } from "./style-resolve.ts";

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

/**
 * A widget's painter — runs after the decoration layers with the
 * walk-resolved style (pseudo-state overrides applied) and the effective
 * states (checked folded in for checked controls).
 */
export type WidgetPainter = (
  ctx: PaintContext,
  node: LayoutNode,
  style: ViewStyle,
  states: InteractionStates
) => void;

/** Per-widget painter registry — assembled by @tsgui/widgets. */
export type WidgetPainters = ReadonlyMap<
  WidgetType | (string & {}),
  WidgetPainter
>;

export interface PaintContext {
  gpu: Painter;
  font: TextPainter;
  /** Per-node interaction flags — production wires the dispatchers. */
  statesOf?(node: LayoutNode): InteractionStates;
  /** The app's state store — uncontrolled widgets resolve values here. */
  stateStore?: StateStore;
  /** Per-widget painters — widget-specific content painting. */
  painters: WidgetPainters;
  /**
   * The transition engine — when present, styles declaring `transition`
   * get their changed properties animated through applyOverlay, and the
   * clock (`animationManager.time`) drives caret blink + indeterminate
   * progress phases.
   */
  animationManager?: AnimationManager;
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

  const resolved = resolveStyle(base, effectiveStates);

  // Styles declaring `transition` animate their changes: the manager
  // compares this frame's resolved values against the displayed ones
  // and overrides in-flight properties (flying-pan's paint/index call
  // site, adapted to the injected manager).
  const style =
    base.transition && ctx.animationManager
      ? ctx.animationManager.applyOverlay(
          node.stableId,
          resolved,
          base.transition
        )
      : resolved;

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

  ctx.painters.get(node.widget.type)?.(ctx, node, style, effectiveStates);

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
