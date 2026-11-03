/**
 * Flex — View with the flex knobs as first-class props. Pure sugar over
 * the generic layoutFlex pass: the shortcuts lower into the style object
 * and a user `style` wins any conflict (flying-pan parity).
 */
import type { BaseWidgetProps, ReconcilableWidget } from "@vulcania/core";
import { WidgetType } from "@vulcania/layout";
import type {
  FlexAlign,
  FlexDirection,
  FlexJustify,
  ViewStyle,
} from "@vulcania/layout";
import { createWidget } from "../create-widget.ts";

export interface FlexProps extends BaseWidgetProps {
  direction: FlexDirection;
  gap?: number;
  justifyContent?: FlexJustify;
  alignItems?: FlexAlign;
  style?: ViewStyle;
  children?: ReconcilableWidget[];
}

export function Flex(props: FlexProps): ReconcilableWidget {
  const {
    direction,
    gap,
    justifyContent,
    alignItems,
    style,
    children,
    key,
    ...handlers
  } = props;

  return createWidget({
    type: WidgetType.Flex,
    props: {},
    style: {
      flexDirection: direction,
      gap,
      justifyContent,
      alignItems,
      ...style,
    },
    children,
    key,
    handlers,
  });
}
