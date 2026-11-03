/**
 * List — a fixed-extent virtualized list. The factory only builds the
 * descriptor: the layout pass (`listLayoutFlex`) injects the visible
 * window plus spacers as children every frame, so 10,000 items never
 * become 10,000 layout nodes.
 *
 * The list is its own scroll container — the default `overflow: scroll`
 * style is what lets the wheel target it and the paint walk clip it.
 */
import type { BaseWidgetProps, ReconcilableWidget } from "@vulcania/core";
import { FlexDirection, ListOrientation, Overflow, WidgetType } from "@vulcania/layout";
import type { ViewStyle } from "@vulcania/layout";
import { createWidget } from "../create-widget.ts";

export interface ListProps extends BaseWidgetProps {
  /** Number of items — must stay under 100,000 (virtual stableId slots). */
  itemCount: number;
  /**
   * Fixed extent of every item on the main axis. The layout pass forces
   * this onto each rendered item's style (flying-pan semantics).
   */
  itemSize: number;
  /** Build one item's descriptor — called per visible index, per frame. */
  renderItem: (index: number) => ReconcilableWidget;
  /** Extra items rendered beyond the viewport on each side. @default 3 */
  overscan?: number;
  /** @default ListOrientation.Vertical */
  orientation?: ListOrientation;
  style?: ViewStyle;
}

export function List(props: ListProps): ReconcilableWidget {
  const {
    itemCount,
    itemSize,
    renderItem,
    overscan,
    orientation = ListOrientation.Vertical,
    style,
    key,
    ...handlers
  } = props;

  return createWidget({
    type: WidgetType.List,
    props: { itemCount, itemSize, renderItem, overscan, orientation },
    style: {
      overflow: Overflow.Scroll,
      width: "100%",
      height: "100%",
      flexDirection:
        orientation === ListOrientation.Horizontal
          ? FlexDirection.Row
          : FlexDirection.Column,
      ...style,
    },
    key,
    handlers,
  });
}
