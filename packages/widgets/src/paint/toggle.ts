/** Toggle painter — the sliding knob sub-mark, ported from flying-pan. */
import type { LayoutNode } from "@tsgui/layout";
import { Palette } from "../design.ts";
import type { PaintContext } from "../paint.ts";
import { paintBackground, paintBorder } from "./shape.ts";
import { propsOf } from "../types.ts";
import type { ToggleProps } from "../widgets/toggle.ts";

const KNOB_INSET = 1;

export function paintToggle(
  ctx: PaintContext,
  node: LayoutNode,
  checked: boolean
): void {
  const props = propsOf<ToggleProps>(node.widget);
  const half = node.width / 2;
  const knobWidth = half - KNOB_INSET;
  const knobHeight = node.height - KNOB_INSET * 2;
  const knobX = checked
    ? node.screenX + half
    : node.screenX + KNOB_INSET;
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
    { backgroundColor: Palette.surface, borderRadius: knobRadius, ...knobStyle },
    knobRadius
  );
}
