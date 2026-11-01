/** CircularProgress — ring (thickness < 1) or pie (thickness ≥ 1). */
import { Palette } from "@tsgui/core";
import type { ReconcilableWidget } from "@tsgui/core";
import {
  CircularProgressDirection,
  PointerEvents,
  WidgetType,
} from "@tsgui/layout";
import { createWidget } from "../../create-widget.ts";
import { resolveProgressType, sharedProgressProps } from "./shared.ts";
import type { CircularProgressProps } from "./types.ts";

export type { CircularProgressProps };

const DEFAULT_SIZE = 48;
const DEFAULT_THICKNESS = 0.1;
const DEFAULT_START_ANGLE = -Math.PI / 2;

export function CircularProgress(
  props: CircularProgressProps
): ReconcilableWidget {
  const { style, key, ...handlers } = props;

  const size = props.size ?? DEFAULT_SIZE;
  const startAngle = props.startAngle ?? DEFAULT_START_ANGLE;
  const direction = props.direction ?? CircularProgressDirection.Clockwise;
  const type = resolveProgressType(props);
  const thickness = props.thickness ?? DEFAULT_THICKNESS;

  return createWidget({
    type: WidgetType.CircularProgress,
    props: {
      ...sharedProgressProps(props),
      type,
      thickness,
      startAngle,
      direction,
      size,
    },
    style: {
      pointerEvents: PointerEvents.None,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: Palette.surfaceActive,
      ...style,
    },
    key,
    handlers,
  });
}
