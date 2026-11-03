/** Checkbox painter — the tick sub-mark, ported from flying-pan. */
import { Palette } from "@vulcania/core";
import { propsOf } from "@vulcania/core";
import { paintBackground, paintBorder, type WidgetPainter } from "@vulcania/paint";
import type { CheckboxProps } from "../checkbox.ts";

const TICK_INSET = 0.5;

export const paintCheckbox: WidgetPainter = (ctx, node, _style, states) => {
  if (!states.checked) return;

  const props = propsOf<CheckboxProps>(node.widget);
  const markWidth = node.width * (props.tickSize ?? TICK_INSET);
  const markHeight = node.height * (props.tickSize ?? TICK_INSET);
  const markX = node.screenX + (node.width - markWidth) / 2;
  const markY = node.screenY + (node.height - markHeight) / 2;
  const tickStyle = props.tickStyle ?? {};

  paintBorder(
    ctx.gpu,
    { x: markX, y: markY, w: markWidth, h: markHeight },
    tickStyle,
    tickStyle.borderRadius
  );
  paintBackground(
    ctx.gpu,
    { x: markX, y: markY, w: markWidth, h: markHeight },
    { backgroundColor: Palette.textOnAccent, ...tickStyle },
    tickStyle.borderRadius
  );
};
