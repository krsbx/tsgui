/** Checkbox painter — the tick sub-mark, ported from flying-pan. */
import type { LayoutNode } from "@tsgui/layout";
import { Palette } from "@tsgui/core";
import type { PaintContext } from "../paint.ts";
import { propsOf } from "@tsgui/core";
import type { CheckboxProps } from "../widgets/checkbox.ts";
import { paintBackground, paintBorder } from "./shape.ts";

const TICK_INSET = 0.5;

export function paintCheckbox(
  ctx: PaintContext,
  node: LayoutNode,
  checked: boolean
): void {
  if (!checked) return;

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
}
