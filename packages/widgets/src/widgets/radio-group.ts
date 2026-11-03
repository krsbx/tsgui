/**
 * RadioGroup — controlled single-select over Radio children. Augments
 * each child with `selected` and a click handler that reports the
 * child's value; a child's own onClick fires first. Children carrying a
 * `label` render as a row with the text beside the dot.
 */
import type { BaseWidgetProps } from "@vulcania/core";
import {
  type PointerPayload,
  propsOf,
  type ReconcilableWidget,
} from "@vulcania/core";
import {
  FlexAlign,
  FlexDirection,
  type ViewStyle,
  WidgetType,
} from "@vulcania/layout";
import { createWidget } from "../create-widget.ts";
import { Label } from "./label.ts";
import type { RadioProps } from "./radio.ts";

export interface RadioGroupProps extends BaseWidgetProps {
  /** Controlled selected value — wins over defaultValue. */
  value?: string;
  /** Uncontrolled initial selection. */
  defaultValue?: string;
  /** Group name for the shared uncontrolled state (derived if absent). */
  name?: string;
  onValueChange?(value: string): void;
  direction?: FlexDirection;
  gap?: number;
  style?: ViewStyle;
  children?: ReconcilableWidget[];
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

  // Uncontrolled groups share state under a derived name; controlled
  // groups resolve from the `value` prop.
  const isControlled = value !== undefined;
  const groupName =
    props.name ??
    `__radio::${(children ?? [])
      .filter((c) => c.type === WidgetType.Radio)
      .map((c) => propsOf<RadioProps>(c).value)
      .join("|")}`;
  const groupDefault = props.defaultValue ?? "";

  const augmented = (children ?? []).map((child) => {
    if (child.type !== WidgetType.Radio) return child;

    const radio = propsOf<RadioProps>(child);
    const isDisabled = radio.disabled === true;

    // The clickable unit keeps the radio's identity (hover/press styles),
    // with the group's selection click wrapped around the child's own.
    const control: ReconcilableWidget = {
      ...child,
      props: {
        ...child.props,
        selected: isControlled ? radio.value === value : undefined,
        name: isControlled ? undefined : groupName,
        groupDefaultValue: isControlled ? undefined : groupDefault,
      },
      key: child.key ?? radio.value,
      onClick: (payload: PointerPayload) => {
        child.onClick?.(payload);
        if (isDisabled) return;

        if (!isControlled && payload.stateStore) {
          payload.stateStore.setStateByName({
            name: groupName,
            value: radio.value,
          });
        }
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
