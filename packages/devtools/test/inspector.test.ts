/**
 * Inspector server over STRUCTURAL fakes — no SDL, no App: inspect()
 * only reads the InspectableApp/InspectableWindow shapes, so the whole
 * HTTP surface (SSE events, selection overlay arming, node detail) is
 * testable in-process.
 */
import { type InteractionStates, StateStore } from "@vulcania/core";
import type { LayoutNode } from "@vulcania/layout";
import { afterAll, describe, expect, test } from "bun:test";
import {
  inspect,
  type InspectHandle,
  type InspectableApp,
  type InspectableWindow,
  snapshotWindow,
} from "../src/index.ts";

const IDLE_STATES: InteractionStates = {
  hovered: false,
  focused: false,
  pressed: false,
  checked: false,
  disabled: false,
};

function node(
  stableId: number,
  overrides: Partial<LayoutNode> = {}
): LayoutNode {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    stableId,
    widget: {
      type: "View",
      props: {},
      style: { backgroundColor: "#16213e" },
    },
    children: [],
    screenX: 10,
    screenY: 20,
    ...overrides,
  } as LayoutNode;
}

function label(text: string, stableId: number): LayoutNode {
  return node(stableId, {
    widget: {
      type: "Label",
      props: { text, font: "default" },
      style: {},
    },
  });
}

function fakeWindow(overrides: Partial<InspectableWindow> = {}): InspectableWindow {
  const layoutIndex = new Map<number, LayoutNode>();
  const win: InspectableWindow = {
    id: 1,
    title: "Test window",
    root: null,
    layoutIndex,
    renderer: { stats: { drawCalls: 12, vertices: 480 } },
    font: { cacheSize: 7 },
    paintOverlay: null,
    pointer: { statesOf: () => ({ ...IDLE_STATES }) },
    focus: { statesOf: () => ({ focused: false }) },
    stateStore: new StateStore(),
    ...overrides,
  };
  return win;
}

function fakeApp(windows: InspectableWindow[]): InspectableApp {
  return { frames: 42, all: windows };
}

/** Read SSE chunks until `count` events arrived (or fail after 2s). */
async function readEvents(
  body: ReadableStream<Uint8Array>,
  count: number
): Promise<Array<{ event: string; data: unknown }>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Array<{ event: string; data: unknown }> = [];

  const deadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("SSE read timed out")), 2_000)
  );

  while (events.length < count) {
    const result = await Promise.race([reader.read(), deadline]);
    buffer += decoder.decode(result.value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = /^data: (.+)$/m.exec(chunk)?.[1];
      // Chunks without a data line (the retry hint) are not events.
      if (data !== undefined) {
        const event = /^event: (.+)$/m.exec(chunk)?.[1] ?? "message";
        events.push({ event, data: JSON.parse(data) });
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
  return events;
}

describe("devtools inspector", () => {
  const handles: InspectHandle[] = [];
  afterAll(async () => {
    for (const handle of handles) await handle.close();
  });

  function start(app: InspectableApp): InspectHandle {
    const handle = inspect(app, {
      port: 0,
      frameIntervalMs: 20,
      treeIntervalMs: 30,
    });
    handles.push(handle);
    return handle;
  }

  test("SSE streams frame stats and tree snapshots", async () => {
    const root = node(5, { children: [label("hello", 6)] });
    const win = fakeWindow({ root });
    win.layoutIndex.set(5, root);

    const handle = start(fakeApp([win]));
    await new Promise((r) => setTimeout(r, 30)); // listen() settles

    const res = await fetch(`http://127.0.0.1:${handle.port}/events`);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    const events = await readEvents(res.body!, 2);
    const frame = events.find((e) => e.event === "frame");
    const tree = events.find((e) => e.event === "tree");
    expect(frame).toBeDefined();
    expect(tree).toBeDefined();

    const frameData = frame!.data as {
      frame: number;
      windows: Array<{ windowId: number; drawCalls: number; fontCache: number }>;
    };
    expect(frameData.frame).toBe(42);
    expect(frameData.windows[0]).toMatchObject({
      windowId: 1,
      drawCalls: 12,
      fontCache: 7,
    });

    const treeData = tree!.data as {
      windows: Array<{ root: { stableId: number; children: Array<{ text?: string }> } }>;
    };
    expect(treeData.windows[0]!.root!.stableId).toBe(5);
    expect(treeData.windows[0]!.root!.children[0]!.text).toBe("hello");
  });

  test("POST /select arms the overlay; POST /clear disarms it", async () => {
    const win = fakeWindow();
    win.layoutIndex.set(9, node(9));
    const handle = start(fakeApp([win]));
    await new Promise((r) => setTimeout(r, 30));

    const selected = await fetch(
      `http://127.0.0.1:${handle.port}/select`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ windowId: 1, stableId: 9 }),
      }
    );
    expect(selected.ok).toBe(true);
    expect(win.paintOverlay).toBeFunction();

    // The overlay draws a 4-bar outline for the node.
    const ops: Array<{ x: number; y: number; w: number; h: number }> = [];
    win.paintOverlay!(
      {
        fillRect: (op: { x: number; y: number; w: number; h: number }) => {
          ops.push(op);
        },
      } as never,
      { layoutIndex: win.layoutIndex }
    );
    expect(ops).toHaveLength(4);

    const cleared = await fetch(`http://127.0.0.1:${handle.port}/clear`, {
      method: "POST",
    });
    expect(cleared.ok).toBe(true);
    expect(win.paintOverlay).toBeNull();
  });

  test("GET /api/node folds states the same way paint does", async () => {
    const win = fakeWindow({
      focus: { statesOf: () => ({ focused: true }) },
    });
    win.layoutIndex.set(
      3,
      node(3, {
        widget: {
          type: "Checkbox",
          props: { checked: true },
          style: { backgroundColor: "#e94560" },
        },
      })
    );
    const handle = start(fakeApp([win]));
    await new Promise((r) => setTimeout(r, 30));

    const res = await fetch(
      `http://127.0.0.1:${handle.port}/api/node?windowId=1&stableId=3`
    );
    expect(res.ok).toBe(true);
    const detail = (await res.json()) as {
      states: InteractionStates;
      style: Record<string, unknown>;
    };
    expect(detail.states.checked).toBe(true);
    expect(detail.states.focused).toBe(true);
    expect(detail.states.hovered).toBe(false);
    expect(detail.style["backgroundColor"]).toBeDefined();

    const missing = await fetch(
      `http://127.0.0.1:${handle.port}/api/node?windowId=1&stableId=999`
    );
    expect(missing.status).toBe(404);
  });

  test("snapshot reflects the laid-out tree shape", () => {
    const win = fakeWindow({
      root: node(1, {
        screenX: 4,
        screenY: 8,
        children: [label("row text", 2)],
      }),
    });

    const snapshot = snapshotWindow(win);
    expect(snapshot.windowId).toBe(1);
    expect(snapshot.root!.rect).toEqual({ x: 4, y: 8, w: 100, h: 20 });
    expect(snapshot.root!.children[0]!.text).toBe("row text");
    expect(snapshot.root!.children[0]!.font).toBe("default");
  });
});
