/**
 * Widget gallery — the full toolkit loop in one window:
 *
 *   build tree (View/Label/Button/Image factories)
 *     → Reconciler (stable identity, diff hooks)
 *     → layoutFlex (injected LayoutContext, real text measurement)
 *     → paintTree (shadow → border → background → widgets → children)
 *
 * Buttons respond to hover/press through their baked pseudo-states, and
 * clicking one updates the counter label — a new descriptor goes through
 * reconcile while every stableId survives.
 *
 *   bun run examples/gallery.ts              # run until window closes
 *   bun run examples/gallery.ts --selftest   # exit after 240 frames
 *   node examples/gallery.ts --selftest
 */
import {
  EventType,
  image,
  PixelFormat,
  Scancode,
  sdl,
  SdlDefines,
} from "@tsgui/bindings";
import { destroyTexture, GpuRenderer, rgba, TtfFont } from "@tsgui/gpu";
import {
  FlexAlign,
  FlexDirection,
  layoutFlex,
  PointerEvents,
  ProgressValueType,
  type LayoutContext,
  type LayoutNode,
} from "@tsgui/layout";
import {
  Button,
  CircularProgress,
  Image,
  Label,
  Meter,
  paintTree,
  Palette,
  ProgressBar,
  Reconciler,
  StateStore,
  View,
  type ReconcilableWidget,
} from "@tsgui/widgets";

const selftest = process.argv.includes("--selftest");

// --- window + renderer ----------------------------------------------------
if (!sdl.SDL_Init({ flags: SdlDefines.SDL_INIT_VIDEO })) {
  throw new Error(`SDL_Init failed: ${sdl.SDL_GetError()}`);
}

const window = sdl.SDL_CreateWindow({
  title: "tsgui — widget gallery",
  w: 1024,
  h: 640,
  flags: SdlDefines.SDL_WINDOW_RESIZABLE,
});
if (!window) throw new Error(`SDL_CreateWindow: ${sdl.SDL_GetError()}`);

const gpu = new GpuRenderer(window);
gpu.clearColor = { r: 17, g: 24, b: 39, a: 255 }; // gray-900 backdrop

const FONT_PATHS = [
  process.env.TSGUI_FONT_PATH,
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
].filter((p): p is string => !!p);
const font = new TtfFont(gpu.renderer, FONT_PATHS[0]!, 18);

// --- a real PNG, generated at runtime through SDL surfaces ----------------
const PNG_PATH = "/tmp/tsgui-gallery.png";
{
  const surface = sdl.SDL_CreateSurface({
    width: 256,
    height: 192,
    format: PixelFormat.SDL_PIXELFORMAT_RGBA32,
  });
  if (!surface) throw new Error(`SDL_CreateSurface: ${sdl.SDL_GetError()}`);
  const teal = rgba({ r: 45, g: 212, b: 191 });
  const navy = rgba({ r: 30, g: 41, b: 59 });
  sdl.SDL_FillSurfaceRect({ dst: surface, rect: null, color: navy });
  for (let i = 0; i < 4; i++) {
    const rect = new Int32Array([24 + i * 56, 32, 40, 128]);
    sdl.SDL_FillSurfaceRect({ dst: surface, rect, color: teal });
  }
  if (!sdl.SDL_SavePNG({ surface, file: PNG_PATH })) {
    throw new Error(`SDL_SavePNG: ${sdl.SDL_GetError()}`);
  }
  sdl.SDL_DestroySurface({ surface });
}

const photo = image.IMG_LoadTexture({ renderer: gpu.renderer, file: PNG_PATH });
if (!photo) throw new Error(`IMG_LoadTexture: ${sdl.SDL_GetError()}`);

// --- widget tree ----------------------------------------------------------
// Rebuilt ONLY when app state changes; the reconciler keeps identity
// across rebuilds and short-circuits identical references entirely.

let clicks = 0;
let dirty = true;

function buildTree(): ReconcilableWidget {
  const increment = (): void => {
    clicks++;
    dirty = true;
  };

  return View({
    style: {
      width: "100%",
      height: "100%",
      flexDirection: FlexDirection.Column,
      padding: 24,
      gap: 16,
    },
    children: [
      // header band
      View({
        style: {
          flexDirection: FlexDirection.Row,
          alignItems: FlexAlign.Center,
          gap: 12,
          padding: 16,
          borderRadius: 12,
          backgroundColor: Palette.accent,
        },
        children: [
          Label({
            text: "tsgui widget gallery",
            style: { color: Palette.textOnAccent },
          }),
          Label({
            text: "reconciler → layout → paint",
            style: { color: Palette.selection },
          }),
        ],
      }),

      Label({ text: `clicked ${clicks} times`, style: { color: Palette.textMuted } }),

      // buttons row — hover/press flow through the baked pseudo-states
      View({
        style: { flexDirection: FlexDirection.Row, gap: 12 },
        children: [
          Button({ children: [Label({ text: "Default" })], onClick: increment }),
          Button({
            children: [Label({ text: "Accent", style: { color: Palette.textOnAccent } })],
            style: {
              backgroundColor: Palette.accent,
              borderColor: Palette.accent,
              _hover: {
                backgroundColor: Palette.accentHover,
                borderColor: Palette.accentHover,
              },
              _active: {
                backgroundColor: Palette.accentActive,
                borderColor: Palette.accentActive,
              },
            },
            onClick: increment,
          }),
          Button({ children: [Label({ text: "Disabled" })], disabled: true }),
        ],
      }),

      // card with layered shadow
      View({
        style: {
          width: 360,
          flexDirection: FlexDirection.Column,
          gap: 8,
          padding: 20,
          borderRadius: 12,
          backgroundColor: Palette.surface,
          boxShadow: { x: 0, y: 8, blur: 24, spread: 0, color: "#020617aa" },
        },
        children: [
          Label({ text: "Card title" }),
          Label({
            text: "Shadow, border, background and text all paint through the same walk.",
            style: { color: Palette.textMuted },
          }),
        ],
      }),

      // progress + meters
      View({
        style: { flexDirection: FlexDirection.Row, gap: 16, alignItems: FlexAlign.Center },
        children: [
          ProgressBar({
            value: 72,
            min: 0,
            max: 100,
            style: { width: 160, height: 6, borderRadius: 3 },
            showValue: ProgressValueType.Percent,
          }),
          ProgressBar({
            value: 6,
            min: 0,
            max: 10,
            steps: 10,
            stepGap: 3,
            style: { width: 100, height: 8 },
          }),
          CircularProgress({ value: 0.66, min: 0, max: 1, size: 40 }),
        ],
      }),
      View({
        style: { flexDirection: FlexDirection.Row, gap: 16, alignItems: FlexAlign.Center },
        children: [
          Meter({ value: 46, style: { width: 120, height: 6 }, showValue: ProgressValueType.Percent }),
          Meter({ value: 14, min: 0, max: 100, low: 25, high: 75, optimum: 90, style: { width: 120, height: 6 } }),
          CircularProgress({ value: 0.3, min: 0, max: 1, size: 40, thickness: 1 }),
        ],
      }),

      // image row
      View({
        style: { flexDirection: FlexDirection.Row, gap: 12 },
        children: [0, 1, 2].map((i) => {
          const img = Image({
            src: PNG_PATH,
            style: { width: 128, height: 96, borderRadius: 8 },
            key: `photo-${i}`,
          });
          // src → texture resolution is phase 4's dispatch; until then the
          // app attaches the already-uploaded handle.
          img.props["texture"] = photo;
          return img;
        }),
      }),

      Label({
        text: "same descriptor reference — the reconciler skips diffing entirely",
        style: { color: Palette.textMuted },
      }),
    ],
  });
}

// --- reconciler + layout context -------------------------------------------
const stateStore = new StateStore();
const reconciler = new Reconciler(stateStore);

let tree = buildTree();

const layoutIndex = new Map<number, LayoutNode>();
const layoutCtx: LayoutContext = {
  layoutIndex,
  focusableNodes: [],
  scrollOffsetOf: () => ({ x: 0, y: 0 }),
  getStableId: reconciler.getStableId,
  measureText: (text) => font.measure(text),
  getImageSize: () => null, // gallery images carry explicit dimensions
};

// --- pointer state (phase 4 generalizes this into the dispatch) -----------
let hoverId = 0;
let pressedId = 0;

const interactionStatesOf = (node: LayoutNode) => ({
  hovered: node.stableId === hoverId,
  pressed: node.stableId === pressedId,
  focused: false,
  checked: false,
  disabled: false,
});

/** Deepest non-pass-through node under the pointer. */
function hitTest(x: number, y: number): number {
  let hit = 0;
  for (const node of layoutIndex.values()) {
    if (node.widget.style?.pointerEvents === PointerEvents.None) continue;
    if (
      x >= node.screenX &&
      x < node.screenX + node.width &&
      y >= node.screenY &&
      y < node.screenY + node.height
    ) {
      hit = node.stableId; // pre-order — the last match is the deepest
    }
  }
  return hit;
}

// --- frame loop ------------------------------------------------------------
const eventData = new Uint8Array(256);
const eventView = new DataView(eventData.buffer);
const sizeW = new Int32Array(1);
const sizeH = new Int32Array(1);

let running = true;
let frames = 0;

while (running) {
  while (sdl.SDL_PollEvent({ event: eventData })) {
    const type = eventView.getUint32(0, true);
    if (type === EventType.SDL_EVENT_QUIT) running = false;
    if (type === EventType.SDL_EVENT_WINDOW_CLOSE_REQUESTED) running = false;
    if (
      type === EventType.SDL_EVENT_KEY_DOWN &&
      eventView.getUint32(24, true) === Scancode.SDL_SCANCODE_ESCAPE
    ) {
      running = false;
    }
    if (type === EventType.SDL_EVENT_MOUSE_MOTION) {
      hoverId = hitTest(eventView.getFloat32(28, true), eventView.getFloat32(32, true));
    }
    if (type === EventType.SDL_EVENT_MOUSE_BUTTON_DOWN && eventView.getUint8(24) === 1) {
      pressedId = hoverId;
    }
    if (type === EventType.SDL_EVENT_MOUSE_BUTTON_UP && eventView.getUint8(24) === 1) {
      if (pressedId !== 0 && hoverId === pressedId) {
        // Layout nodes carry the reconciled descriptors.
        const widget = layoutIndex.get(pressedId)!.widget as ReconcilableWidget;
        widget.onClick?.({
          x: eventView.getFloat32(28, true),
          y: eventView.getFloat32(32, true),
        });
      }
      pressedId = 0;
    }
  }

  if (dirty) {
    tree = buildTree(); // new descriptors — identity survives via reconcile
    dirty = false;
  }
  const reconciled = reconciler.reconcile(tree);

  sdl.SDL_GetWindowSize({ window, w: sizeW, h: sizeH });
  layoutIndex.clear();
  const root = layoutFlex({
    node: reconciled.widget,
    x: 0,
    y: 0,
    availableWidth: sizeW[0]!,
    availableHeight: sizeH[0]!,
    ctx: layoutCtx,
  });

  gpu.beginFrame();
  paintTree({ gpu, font, statesOf: interactionStatesOf }, root);
  gpu.present();

  frames++;
  if (selftest && frames >= 240) running = false;
  sdl.SDL_Delay({ ms: 16 });
}

destroyTexture(photo);
font.destroy();
gpu.destroy();
sdl.SDL_DestroyWindow({ window });
sdl.SDL_Quit();

console.log(`gallery: ${frames} frames, ${layoutIndex.size} nodes, ok`);
