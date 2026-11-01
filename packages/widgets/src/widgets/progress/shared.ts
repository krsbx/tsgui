/** Props plumbing shared by both progress factories. */
import { Palette } from "@tsgui/core";
import { ProgressType } from "@tsgui/layout";
import type { ProgressProps } from "./types.ts";

/** The ProgressProps fields both factories carry into the descriptor. */
export function sharedProgressProps(props: ProgressProps): ProgressProps {
  return {
    value: props.value,
    buffer: props.buffer,
    min: props.min,
    max: props.max,
    type: props.type,
    colorStops: props.colorStops,
    label: props.label,
    labelStyle: props.labelStyle,
    showValue: props.showValue,
    fillStyle: {
      backgroundColor: Palette.accent,
      ...props.fillStyle,
    },
    bufferStyle: props.bufferStyle,
  };
}

/** Determinate when `value` is set; otherwise the requested type. */
export function resolveProgressType(props: ProgressProps): ProgressType {
  return props.value !== undefined
    ? ProgressType.Determinate
    : (props.type ?? ProgressType.Indeterminate);
}
