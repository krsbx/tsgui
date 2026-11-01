/** Radio painter — the dot sub-mark, ported from flying-pan. */
import { Palette } from "@tsgui/core";
import { propsOf } from "@tsgui/core";
import { paintBackground, paintBorder, type WidgetPainter } from "@tsgui/paint";
import type { RadioProps } from "../radio.ts";

const DOT_INSET = 0.5;

export const paintRadio: WidgetPainter = (ctx, node, _style, states) => {
  if (!states.checked) return;

  const props = propsOf<RadioProps>(node.widget);
  const dotSize =
    Math.min(node.width, node.height) * (props.dotSize ?? DOT_INSET);
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
};
