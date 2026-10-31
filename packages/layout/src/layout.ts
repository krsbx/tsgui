/**
 * layoutFlex — the core recursive layout function.
 * Ported from flying-pan's layout/layout with the renderer context
 * replaced by the minimal injected LayoutContext.
 */
import { FlexWrap } from "./enums.ts";
import { resolveSize, resolveSpacing } from "./style-resolve.ts";
import { positionAbsolute } from "./absolute.ts";
import { measureChildsComponent } from "./measurement.ts";
import { widgetLevelLayoutFlex } from "./processor/list.ts";
import type { LayoutFlexFn, LayoutNode } from "./types.ts";
import { layoutSingleLine, layoutWrap } from "./wrap.ts";

export const layoutFlex: LayoutFlexFn = function (options) {
  const { node, x, y, availableWidth, availableHeight, ctx } = options;
  const scrollAccumulated = options.scrollAccumulated ?? { x: 0, y: 0 };
  const style = node.style ?? {};

  const padding = resolveSpacing(style.padding, availableWidth);
  const isRow = style.flexDirection !== "column";

  const hasExplicitWidth = style.width != null;
  const hasExplicitHeight = style.height != null;

  const width = resolveSize(style.width, availableWidth);
  const height = resolveSize(style.height, availableHeight);

  let contentWidth = (width || availableWidth) - padding.left - padding.right;
  let contentHeight = (height || availableHeight) - padding.top - padding.bottom;

  const gap = resolveSize(style.gap, contentWidth);

  const stableId = ctx.getStableId(node);
  const children: LayoutNode[] = [];

  // Create + register pre-order: folds layoutIndex + focusable collection
  // into the layout pass.
  const layoutNode: LayoutNode = {
    widget: node,
    stableId,
    x,
    y,
    width: contentWidth + padding.left + padding.right,
    height: contentHeight + padding.top + padding.bottom,
    children,
    screenX: x + scrollAccumulated.x,
    screenY: y + scrollAccumulated.y,
  };

  ctx.layoutIndex.set(stableId, layoutNode);

  // Child scroll accumulation: scrollable nodes shift their children's
  // screen-space positions by their committed scroll offset.
  const overflow = style.overflow;
  const isScrollable = overflow === "scroll" || overflow === "auto";

  const childAccumulated = { ...scrollAccumulated };

  if (isScrollable) {
    const offset = ctx.scrollOffsetOf(layoutNode);
    childAccumulated.x -= offset.x;
    childAccumulated.y -= offset.y;
  }

  if (style.focusable === true) {
    ctx.focusableNodes.push(layoutNode);
  }

  widgetLevelLayoutFlex({
    node,
    ctx,
    layoutNode,
    contentWidth,
    contentHeight,
    stableId,
  });

  if (!node.children || node.children.length === 0) {
    return layoutNode;
  }

  const { flow, absolute, maxH, sumH, maxW, sumW } = measureChildsComponent({
    children: node.children,
    parentWidth: contentWidth,
    parentHeight: contentHeight,
    ctx,
  });

  // Content-fit: containers without explicit dimensions size to content.
  if (flow.length > 0) {
    const gaps = flow.length > 1 ? gap * (flow.length - 1) : 0;

    if (!hasExplicitHeight) {
      contentHeight = isRow ? maxH : sumH + gaps;
      layoutNode.height = contentHeight + padding.top + padding.bottom;
    }

    if (!hasExplicitWidth) {
      contentWidth = isRow ? sumW + gaps : maxW;
      layoutNode.width = contentWidth + padding.left + padding.right;
    }
  }

  const lineOptions = {
    flow,
    style,
    padding,
    isRow,
    gap,
    contentWidth,
    contentHeight,
    x,
    y,
    children,
    ctx,
    scrollAccumulated: childAccumulated,
  };

  if (flow.length > 0) {
    if (style.flexWrap === FlexWrap.Wrap) {
      layoutWrap(lineOptions, layoutFlex);
    } else {
      layoutSingleLine(lineOptions, layoutFlex);
    }
  }

  for (const m of absolute) {
    positionAbsolute({ m, ...lineOptions }, layoutFlex);
  }

  return layoutNode;
};
