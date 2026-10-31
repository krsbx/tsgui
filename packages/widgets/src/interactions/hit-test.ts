/**
 * Hit-tests a screen-space point against the layout tree — ported from
 * flying-pan's interactions/utility/hit-test.
 *
 * Reads `node.screenX`/`screenY` (written during `layoutFlex` via
 * threaded `scrollAccumulated`) so the check matches what the user sees
 * drawn. Children are tested first, last sibling deepest — the visual
 * top wins.
 */
import { PointerEvents, type LayoutNode } from "@tsgui/layout";

export interface HitTestOptions {
  node: LayoutNode;
  x: number;
  y: number;
}

export function hitTest(options: HitTestOptions): LayoutNode | null {
  const { node, x, y } = options;

  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];

    if (!child) continue;

    const hit = hitTest({ node: child, x, y });

    if (hit) return hit;
  }

  const inRect =
    x >= node.screenX &&
    x <= node.screenX + node.width &&
    y >= node.screenY &&
    y <= node.screenY + node.height;

  if (inRect && node.widget.style?.pointerEvents !== PointerEvents.None) {
    return node;
  }

  return null;
}
