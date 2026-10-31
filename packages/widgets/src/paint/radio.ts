/** Radio painter — the dot sub-mark, ported from flying-pan. */
import type { LayoutNode } from "@tsgui/layout";
import { Palette } from "../design.ts";
import type { PaintContext } from "../paint.ts";
import { paintBackground, paintBorder } from "./fill.ts";
import { propsOf } from "../types.ts";
import type { RadioProps } from "../widgets/radio.ts";

const DOT_INSET = 0.5;

export function paintRadio(
  ctx: PaintContext,
  node: LayoutNode,
  checked: boolean
): void {
  if (!checked) return;

  const props = propsOf<RadioProps>(node.widget);
  const dotSize = Math.min(node.width, node.height) * (props.dotSize ?? DOT_INSET);
  const dotX = node.screenX + (node.width - dotSize) / 2;
  const dotY = node.screenY + (node.height - dotSize) / 2;
  const dotStyle = props.dotStyle ?? {};
  const dotRadius = dotSize / 2;

  paintBorder(
    ctx.gpu,
    { x: dotX, y: dotY, w: dotSize, h: dotSize },
    { borderRadius: dotRadius, ...dotStyle },
    dotRadius
  );
  paintBackground(
    ctx.gpu,
    { x: dotX, y: dotY, w: dotSize, h: dotSize },
    { backgroundColor: Palette.accent, borderRadius: dotRadius, ...dotStyle },
    dotRadius
  );
}
