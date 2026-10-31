/** List virtualization processor — ported from flying-pan. */
import { WidgetType } from "../enums.ts";
import type { WidgetDescriptor } from "../style.ts";
import type { LayoutContext, LayoutNode } from "../types.ts";

const MAX_ITEM_COUNT = 100_001;

interface ListProps {
  itemCount: number;
  itemSize: number;
  renderItem(index: number): WidgetDescriptor;
  overscan?: number;
  orientation?: "horizontal" | "vertical";
}

function withVirtualStableId(
  widget: WidgetDescriptor,
  listStableId: number,
  slot: number
): WidgetDescriptor {
  widget._virtualStableId = -(listStableId * MAX_ITEM_COUNT + slot + 1);
  return widget;
}

export interface WidgetLevelLayoutFlexOptions {
  node: WidgetDescriptor;
  ctx: LayoutContext;
  layoutNode: LayoutNode;
  contentWidth: number;
  contentHeight: number;
  stableId: number;
}

export function listLayoutFlex(options: WidgetLevelLayoutFlexOptions): void {
  const { layoutNode, node, contentHeight, contentWidth, stableId, ctx } =
    options;

  const props = node.props as unknown as ListProps;
  const { itemCount, itemSize, renderItem, overscan = 3, orientation } = props;

  const isHorizontal = orientation === "horizontal";
  const scrollOffset = ctx.scrollOffsetOf(layoutNode);
  const viewport = isHorizontal ? contentWidth : contentHeight;

  const scrollPos = isHorizontal ? scrollOffset.x : scrollOffset.y;
  const firstVisible = Math.max(0, Math.floor(scrollPos / itemSize) - overscan);
  const lastVisible = Math.min(
    itemCount,
    Math.ceil((scrollPos + viewport) / itemSize) + overscan
  );

  const virtualChildren: WidgetDescriptor[] = [];

  if (firstVisible > 0) {
    virtualChildren.push(
      withVirtualStableId(
        {
          type: WidgetType.View,
          props: {},
          style: isHorizontal
            ? { height: "100%", width: firstVisible * itemSize }
            : { width: "100%", height: firstVisible * itemSize },
        },
        stableId,
        0
      )
    );
  }

  for (let i = firstVisible; i < lastVisible; i++) {
    const item = renderItem(i);

    item.style = {
      ...item.style,
      [isHorizontal ? "width" : "height"]: itemSize,
    };

    virtualChildren.push(withVirtualStableId(item, stableId, i + 1));
  }

  if (lastVisible < itemCount) {
    virtualChildren.push(
      withVirtualStableId(
        {
          type: WidgetType.View,
          props: {},
          style: isHorizontal
            ? { height: "100%", width: (itemCount - lastVisible) * itemSize }
            : { width: "100%", height: (itemCount - lastVisible) * itemSize },
        },
        stableId,
        itemCount + 1
      )
    );
  }

  node.children = virtualChildren;
}

export function widgetLevelLayoutFlex(options: WidgetLevelLayoutFlexOptions): void {
  if (options.node.type === WidgetType.List) {
    listLayoutFlex(options);
  }
}
