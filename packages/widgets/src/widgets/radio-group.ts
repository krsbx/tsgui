/**
 * RadioGroup — controlled single-select over Radio children. Augments
 * each child with `selected` and a click handler that reports the
 * child's value; a child's own onClick fires first. Children carrying a
 * `label` render as a row with the text beside the dot.
 */
import {
  FlexAlign,
  FlexDirection,
  WidgetType,
  type ViewStyle,
} from "@tsgui/layout";
import { createWidget } from "../create-widget.ts";
import { Label } from "./label.ts";
import type { RadioProps } from "./radio.ts";
import { propsOf, type Key, type PointerPayload, type ReconcilableWidget } from "../types.ts";

export interface RadioGroupProps {
  /** Controlled selected value. */
  value?: string;
  onValueChange?(value: string): void;
  direction?: FlexDirection;
  gap?: number;
  style?: ViewStyle;
  children?: ReconcilableWidget[];
  key?: Key;
}

export function RadioGroup(props: RadioGroupProps): ReconcilableWidget {
  const {
    value,
    onValueChange,
    direction = FlexDirection.Column,
    gap = 8,
    style,
    children,
    key,
  } = props;

  const augmented = (children ?? []).map((child) => {
    if (child.type !== WidgetType.Radio) return child;

    const radio = propsOf<RadioProps>(child);
    const isDisabled = radio.disabled === true;

    // The clickable unit keeps the radio's identity (hover/press styles),
    // with the group's selection click wrapped around the child's own.
    const control: ReconcilableWidget = {
      ...child,
      props: { ...child.props, selected: radio.value === value },
      key: child.key ?? radio.value,
      onClick: (payload: PointerPayload) => {
        child.onClick?.(payload);
        if (isDisabled) return;
        onValueChange?.(radio.value);
      },
    };

    if (radio.label === undefined) return control;

    return createWidget({
      type: WidgetType.View,
      props: {},
      style: {
        flexDirection: FlexDirection.Row,
        alignItems: FlexAlign.Center,
        gap: 8,
      },
      children: [
        control,
        Label({ text: radio.label, style: radio.labelStyle }),
      ],
      key: child.key ?? radio.value,
      handlers: {},
    });
  });

  return createWidget({
    type: WidgetType.View,
    props: {},
    style: {
      flexDirection: direction,
      gap,
      ...style,
    },
    children: augmented,
    key,
    handlers: {},
  });
}
