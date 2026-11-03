/** Image painter — draws the descriptor's texture across the widget box. */
import type { TextureDrawOptions } from "@vulcania/gpu";
import { type PaintContext, type WidgetPainter } from "@vulcania/paint";

export const paintImage: WidgetPainter = (ctx: PaintContext, node) => {
  // Descriptors carry the texture as an opaque prop; the painter trusts
  // the app layer to store a real texture handle there.
  const texture = node.widget.props["texture"] as TextureDrawOptions["texture"];
  if (!texture) return;

  ctx.gpu.drawTexture({
    texture,
    x: node.screenX,
    y: node.screenY,
    w: node.width,
    h: node.height,
  });
};
