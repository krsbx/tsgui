/**
 * Devtools inspector server — node:http + SSE, NOT Bun.serve: devtools
 * ships to apps running on BOTH Bun and Node, and SSE needs zero
 * dependencies. The App run loop awaits its frame delay, so this server
 * gets event-loop time between frames.
 *
 * Protocol:
 *   GET  /events                      SSE — `frame` stats (≤10 Hz) +
 *                                     `tree` snapshots (≤4 Hz)
 *   POST /select {windowId, stableId} arms the window's paintOverlay —
 *                                     a 2px accent outline on the node
 *   POST /clear                       disarms every overlay
 *   GET  /api/node?windowId&stableId  states + resolved style detail
 *   GET  /                            the single-file UI
 */
import { readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { parseColor, type Painter } from "@vulcania/paint";
import type { LayoutNode } from "@vulcania/layout";
import { nodeDetail } from "./detail.ts";
import { snapshotWindow } from "./snapshot.ts";
import type { InspectableApp, TreeSnapshot } from "./types.ts";

const ACCENT = "#e94560";
const OUTLINE_PX = 2;
const FRAME_EVENT_MS = 100; // ≤10 Hz frame stats
const TREE_EVENT_MS = 250; // ≤4 Hz tree snapshots

export interface InspectOptions {
  /** @default 6060 */
  port?: number;
  /** @default 127.0.0.1 — loopback only; the inspector trusts the app. */
  host?: string;
  /** Test seam — tighten the sampler periods. @default 100 */
  frameIntervalMs?: number;
  /** Test seam. @default 250 */
  treeIntervalMs?: number;
}

export interface InspectHandle {
  /** The actually-bound port (an ephemeral port resolves here). */
  readonly port: number;
  /** Stop the samplers and close the server. */
  close(): Promise<void>;
}

interface Client {
  res: ServerResponse;
}

export function inspect(
  app: InspectableApp,
  options: InspectOptions = {}
): InspectHandle {
  const clients = new Set<Client>();
  let selection: { windowId: number; stableId: number } | null = null;

  const broadcast = (event: string, payload: unknown): void => {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) client.res.write(chunk);
  };

  const windowOf = (windowId: number): InspectableApp["all"][number] | null =>
    app.all.find((window) => window.id === windowId) ?? null;

  const server: Server = createServer((req, res) => {
    void route(req, res);
  });

  const route = async (
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/") {
        const html = await readFile(
          new URL("./ui/inspect.html", import.meta.url),
          "utf8"
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (req.method === "GET" && url.pathname === "/events") {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        res.write("retry: 1000\n\n");
        const client: Client = { res };
        clients.add(client);
        req.on("close", () => {
          clients.delete(client);
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/select") {
        const body = JSON.parse(await readBody(req)) as {
          windowId?: number;
          stableId?: number;
        };
        if (
          typeof body.windowId !== "number" ||
          typeof body.stableId !== "number"
        ) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "windowId and stableId are required numbers" }));
          return;
        }
        selection = { windowId: body.windowId, stableId: body.stableId };
        for (const window of app.all) window.paintOverlay = null;
        const window = windowOf(body.windowId);
        if (!window) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "no such window" }));
          return;
        }
        const { stableId } = body;
        window.paintOverlay = (gpu: Painter, target) => {
          const node = target.layoutIndex.get(stableId);
          if (node) drawSelectionOutline(gpu, node);
        };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === "POST" && url.pathname === "/clear") {
        selection = null;
        for (const window of app.all) window.paintOverlay = null;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/node") {
        const windowId = Number(url.searchParams.get("windowId"));
        const stableId = Number(url.searchParams.get("stableId"));
        const window = windowOf(windowId);
        const detail = window ? nodeDetail(window, stableId) : null;
        if (!detail) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "no such node" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(detail));
        return;
      }

      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(error) }));
    }
  };

  const frameTimer = setInterval(() => {
    broadcast("frame", {
      frame: app.frames,
      windows: app.all.map((window) => ({
        windowId: window.id,
        title: window.title,
        drawCalls: window.renderer.stats.drawCalls,
        vertices: window.renderer.stats.vertices,
        fontCache: window.font.cacheSize,
        nodes: window.layoutIndex.size,
      })),
      selected: selection,
    });
  }, options.frameIntervalMs ?? FRAME_EVENT_MS);

  const treeTimer = setInterval(() => {
    const snapshot: TreeSnapshot = {
      frame: app.frames,
      windows: app.all.map(snapshotWindow),
    };
    broadcast("tree", snapshot);
  }, options.treeIntervalMs ?? TREE_EVENT_MS);

  server.listen(options.port ?? 6060, options.host ?? "127.0.0.1");

  return {
    get port(): number {
      const address = server.address();
      return typeof address === "object" && address
        ? address.port
        : (options.port ?? 6060);
    },
    close(): Promise<void> {
      clearInterval(frameTimer);
      clearInterval(treeTimer);
      for (const client of clients) client.res.end();
      clients.clear();
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

/** 2px accent bars along the node's screen-space rect — flying-pan's
 *  selection highlight shape. */
function drawSelectionOutline(gpu: Painter, node: LayoutNode): void {
  const color = parseColor(ACCENT);
  const t = OUTLINE_PX;
  const x = node.screenX;
  const y = node.screenY;
  const w = node.width;
  const h = node.height;

  gpu.fillRect({ x, y, w, h: t, color });
  gpu.fillRect({ x, y: y + h - t, w, h: t, color });
  gpu.fillRect({ x, y, w: t, h, color });
  gpu.fillRect({ x: x + w - t, y, w: t, h, color });
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
