/**
 * Node detail — the selected stableId's states and resolved style for
 * the inspector's details pane. States fold through the SAME
 * effectiveStatesFor the paint walk uses, so what the panel reports is
 * exactly what the frame rendered. Only JSON-safe primitives leave the
 * process (functions are dropped).
 */
import { effectiveStatesFor, resolveStyle } from "@vulcania/paint";
import type { PaintContext } from "@vulcania/paint";
import type { InteractionStates } from "@vulcania/core";
import type { InspectableWindow } from "./types.ts";

export interface NodeDetail {
  stableId: number;
  windowId: number;
  type: string;
  key: unknown;
  text?: string;
  font?: string;
  rect: { x: number; y: number; w: number; h: number };
  states: InteractionStates;
  style: Record<string, unknown>;
  childCount: number;
}

export function nodeDetail(
  window: InspectableWindow,
  stableId: number
): NodeDetail | null {
  const node = window.layoutIndex.get(stableId);
  if (!node) return null;

  // The same fold paintNode uses — dispatcher states + checked.
  const ctx: Pick<PaintContext, "statesOf" | "stateStore"> = {
    statesOf: (n) => ({
      ...window.pointer.statesOf(n),
      ...window.focus.statesOf(n),
    }),
    stateStore: window.stateStore,
  };
  const states = effectiveStatesFor(ctx, node);
  const resolved = resolveStyle(node.widget.style ?? {}, states);

  const props = node.widget.props as Record<string, unknown>;
  const text = typeof props["text"] === "string" ? props["text"] : undefined;
  const font = typeof props["font"] === "string" ? props["font"] : undefined;

  return {
    stableId,
    windowId: window.id,
    type: node.widget.type,
    key: (node.widget as { key?: unknown }).key ?? null,
    ...(text !== undefined ? { text } : {}),
    ...(font !== undefined ? { font } : {}),
    rect: {
      x: node.screenX,
      y: node.screenY,
      w: node.width,
      h: node.height,
    },
    states: { ...states },
    style: jsonSafe(resolved as unknown as Record<string, unknown>),
    childCount: node.children.length,
  };
}

function jsonSafe(style: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(style)) {
    if (typeof value !== "function") out[name] = value;
  }
  return out;
}
