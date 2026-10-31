/** Flow-child positioning — ported from flying-pan's layout/flow. */
import { FlexAlign, FlexJustify, Position } from "./enums.ts";
import { resolveSize } from "./style-resolve.ts";
import type { LayoutFlexFn, PositionFlowChildrenOptions } from "./types.ts";

export function positionFlowChildren(
  options: PositionFlowChildrenOptions,
  layoutFlex: LayoutFlexFn
): void {
  const {
    measurements,
    alignItems,
    isRow,
    padding,
    crossAxisSize,
    mainPos: startMainPos,
    spaceBetweenGap,
    spaceEvenlyGap,
    justifyItems,
    x,
    y,
    gap,
    ctx,
    children,
    scrollAccumulated,
  } = options;

  let mainPos = startMainPos;

  for (const m of measurements) {
    const childCrossStart = isRow ? padding.top : padding.left;
    const childMain = mainPos + (isRow ? m.margin.left : m.margin.top);

    const childCrossSize = isRow ? m.height : m.width;
    const crossWithMargin = isRow
      ? crossAxisSize - m.margin.top - m.margin.bottom
      : crossAxisSize - m.margin.left - m.margin.right;

    let crossPos = childCrossStart;

    const childAlign = m.widget.style?.alignSelf ?? alignItems;

    switch (childAlign) {
      case FlexAlign.Center:
        crossPos += (crossWithMargin - childCrossSize) / 2;
        break;
      case FlexAlign.End:
        crossPos += crossWithMargin - childCrossSize;
        break;
      default:
        break;
    }

    crossPos += isRow ? m.margin.top : m.margin.left;
    const childX = isRow ? childMain : crossPos;
    const childY = isRow ? crossPos : childMain;

    let adjX = childX;
    let adjY = childY;

    // position: relative offset
    if (m.widget.style?.position === Position.Relative) {
      if (m.widget.style.left != null)
        adjX += resolveSize(m.widget.style.left, crossAxisSize);
      if (m.widget.style.top != null)
        adjY += resolveSize(m.widget.style.top, crossAxisSize);
    }

    const childLayout = layoutFlex({
      node: m.widget,
      x: x + adjX,
      y: y + adjY,
      availableWidth: m.width,
      availableHeight: m.height,
      ctx,
      scrollAccumulated,
    });

    children.push(childLayout);

    // ACTUAL laid-out size (post content-fit), not pre-layout measurement.
    const childMainSize = isRow ? childLayout.width : childLayout.height;
    const marginEnd = isRow ? m.margin.right : m.margin.bottom;

    mainPos += childMainSize + marginEnd + gap;

    if (justifyItems === FlexJustify.SpaceBetween) {
      mainPos += spaceBetweenGap;
    } else if (justifyItems === FlexJustify.SpaceEvenly) {
      mainPos += spaceEvenlyGap;
    }
  }
}
