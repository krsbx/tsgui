/** ProgressBar — linear, horizontal/vertical, forward/backward, stepped. */
import {
  PointerEvents,
  ProgressDirection,
  ProgressBarOrientation,
  WidgetType,
} from "@tsgui/layout";
import { Palette } from "../../design.ts";
import { createWidget } from "../../create-widget.ts";
import type { ReconcilableWidget } from "../../types.ts";
import { resolveProgressType, sharedProgressProps } from "./shared.ts";
import type { ProgressBarProps } from "./types.ts";

export type { ProgressBarProps };

const DEFAULT_STEP_GAP = 2;

export function ProgressBar(props: ProgressBarProps): ReconcilableWidget {
  const { style, key, ...handlers } = props;

  const orientation = props.orientation ?? ProgressBarOrientation.Horizontal;
  const direction = props.direction ?? ProgressDirection.Forward;
  const type = resolveProgressType(props);
  const isHorizontal = orientation === ProgressBarOrientation.Horizontal;

  return createWidget({
    type: WidgetType.ProgressBar,
    props: {
      ...sharedProgressProps(props),
      type,
      steps: props.steps,
      stepGap: props.stepGap ?? DEFAULT_STEP_GAP,
      orientation,
      direction,
    },
    style: {
      pointerEvents: PointerEvents.None,
      width: isHorizontal ? 48 : 4,
      height: isHorizontal ? 4 : 48,
      backgroundColor: Palette.surfaceActive,
      ...style,
    },
    key,
    handlers,
  });
}
