/** Toggle painter — the sliding knob sub-mark, ported from flying-pan. */
import { Palette } from "@vulcania/core";
import { propsOf } from "@vulcania/core";
import { paintBackground, paintBorder, type WidgetPainter } from "@vulcania/paint";
import type { ToggleProps } from "../toggle.ts";

const KNOB_INSET = 1;

export const paintToggle: WidgetPainter = (ctx, node, _style, states) => {
  const checked = states.checked;
  const props = propsOf<ToggleProps>(node.widget);
  const half = node.width / 2;
  const knobWidth = half - KNOB_INSET;
  const knobHeight = node.height - KNOB_INSET * 2;
  const knobX = checked ? node.screenX + half : node.screenX + KNOB_INSET;
  const knobY = node.screenY + KNOB_INSET;
  const knobStyle = props.knobStyle ?? {};
  // The knob is a pill regardless of the track's corners.
  const knobRadius = knobHeight / 2;

  paintBorder(
    ctx.gpu,
    { x: knobX, y: knobY, w: knobWidth, h: knobHeight },
    { borderRadius: knobRadius, ...knobStyle },
    knobRadius
  );
  paintBackground(
    ctx.gpu,
    { x: knobX, y: knobY, w: knobWidth, h: knobHeight },
    {
      backgroundColor: Palette.surface,
      borderRadius: knobRadius,
      ...knobStyle,
    },
    knobRadius
  );
};
