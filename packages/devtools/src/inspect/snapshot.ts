/**
 * Tree snapshots — the inspector's rich serialization of a laid-out
 * window. A superset of the harness's structural serializeLayoutTree:
 * rects are screen-space, and text/font/key props ride along so the UI
 * can label rows without a detail round-trip.
 */
import type { LayoutNode } from "@vulcania/layout";
import type {
  InspectableWindow,
  SnapshotNode,
  WindowSnapshot,
} from "./types.ts";

export function snapshotWindow(window: InspectableWindow): WindowSnapshot {
  return {
    windowId: window.id,
    title: window.title,
    root: window.root ? snapshotNode(window.root) : null,
  };
}

function snapshotNode(node: LayoutNode): SnapshotNode {
  const props = node.widget.props as Record<string, unknown>;
  const text = typeof props["text"] === "string" ? props["text"] : undefined;
  const font = typeof props["font"] === "string" ? props["font"] : undefined;
  const key = (node.widget as { key?: unknown }).key;

  return {
    stableId: node.stableId,
    type: node.widget.type,
    rect: {
      x: node.screenX,
      y: node.screenY,
      w: node.width,
      h: node.height,
    },
    ...(text !== undefined ? { text } : {}),
    ...(font !== undefined ? { font } : {}),
    ...(key !== undefined ? { key } : {}),
    children: node.children.map(snapshotNode),
  };
}
