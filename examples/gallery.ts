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
  readCString,
  Scancode,
  sdl,
  SdlDefines,
} from "@tsgui/bindings";
import { destroyTexture, GpuRenderer, rgba, TtfFont } from "@tsgui/gpu";
import {
  FlexAlign,
  FlexDirection,
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  ProgressValueType,
} from "@tsgui/layout";
import {
  Button,
  Checkbox,
  CircularProgress,
  CircularSlider,
  FocusDispatcher,
  Image,
  KeyModifiers,
  KeyboardInputKind,
  Label,
  Meter,
  type MouseButton,
  paintTree,
  Palette,
  PointerDispatcher,
  type KeyboardInputEvent,
  type PointerInputEvent,
  PointerInputKind,
  ProgressBar,
  Radio,
  RadioGroup,
  type ReconcilableWidget,
  Reconciler,
  SliderBar,
  StateStore,
  TextInput,
  Toggle,
  View,
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

// SDL3 requires explicit opt-in before SDL_EVENT_TEXT_INPUT flows.
if (!sdl.SDL_StartTextInput({ window })) {
  throw new Error(`SDL_StartTextInput: ${sdl.SDL_GetError()}`);
}

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
let agree = false;
let wifi = true;
let flavor = "mint";
let volume = 65;
let tone = 30;
let name = "";
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

      Label({
        text: `clicked ${clicks} times · agree ${agree ? "✓" : "✗"} · wifi ${wifi ? "on" : "off"} · ${flavor} · vol ${Math.round(volume)} · tone ${Math.round(tone)}`,
        style: { color: Palette.textMuted },
      }),

      // buttons row — hover/press flow through the baked pseudo-states
      View({
        style: { flexDirection: FlexDirection.Row, gap: 12 },
        children: [
          Button({
            children: [Label({ text: "Default" })],
            onClick: increment,
          }),
          Button({
            children: [
              Label({ text: "Accent", style: { color: Palette.textOnAccent } }),
            ],
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

      // controls — click dispatch through the pointer dispatcher
      View({
        style: {
          flexDirection: FlexDirection.Row,
          gap: 24,
          alignItems: FlexAlign.Center,
        },
        children: [
          Checkbox({
            checked: agree,
            onCheckedChange: (next) => {
              agree = next;
              dirty = true;
            },
          }),
          Checkbox({
            checked: agree,
            onCheckedChange: (next) => {
              agree = next;
              clicks++;
              dirty = true;
            },
            disabled: true,
          }),
          Toggle({
            checked: wifi,
            onCheckedChange: (next) => {
              wifi = next;
              dirty = true;
            },
          }),
          RadioGroup({
            value: flavor,
            onValueChange: (next) => {
              flavor = next;
              dirty = true;
            },
            children: [
              Radio({ value: "mint", label: "Mint" }),
              Radio({ value: "berry", label: "Berry" }),
              Radio({ value: "lime", label: "Lime", disabled: true }),
            ],
          }),
        ],
      }),

      // sliders — drag through the dispatcher's press capture
      View({
        style: {
          flexDirection: FlexDirection.Row,
          gap: 24,
          alignItems: FlexAlign.Center,
        },
        children: [
          SliderBar({
            value: volume,
            min: 0,
            max: 100,
            style: { width: 180, height: 24 },
            marks: [
              { value: 0, label: "0" },
              { value: 50, label: "50" },
              { value: 100, label: "100" },
            ],
            onChange: (next) => {
              volume = next;
              dirty = true;
            },
          }),
          CircularSlider({
            value: tone,
            min: 0,
            max: 100,
            size: 48,
            onChange: (next) => {
              tone = next;
              dirty = true;
            },
          }),
        ],
      }),

      // text input — focus via click, edit through the keyboard dispatch
      View({
        style: { flexDirection: FlexDirection.Row, gap: 12, alignItems: FlexAlign.Center },
        children: [
          TextInput({
            value: name,
            placeholder: "Type your name…",
            style: { width: 220, height: 28 },
            onChange: (next) => {
              name = next;
              dirty = true;
            },
          }),
          Label({
            text: name.length > 0 ? `hello, ${name}` : "hello, stranger",
            style: { color: Palette.textMuted },
          }),
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
        style: {
          flexDirection: FlexDirection.Row,
          gap: 16,
          alignItems: FlexAlign.Center,
        },
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
        style: {
          flexDirection: FlexDirection.Row,
          gap: 16,
          alignItems: FlexAlign.Center,
        },
        children: [
          Meter({
            value: 46,
            style: { width: 120, height: 6 },
            showValue: ProgressValueType.Percent,
          }),
          Meter({
            value: 14,
            min: 0,
            max: 100,
            low: 25,
            high: 75,
            optimum: 90,
            style: { width: 120, height: 6 },
          }),
          CircularProgress({
            value: 0.3,
            min: 0,
            max: 1,
            size: 40,
            thickness: 1,
          }),
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

// --- dispatchers (the phase 4 port) ----------------------------------------
const pointer = new PointerDispatcher();
const focusDispatcher = new FocusDispatcher();
const pointerEvents: PointerInputEvent[] = [];
const keyboardEvents: KeyboardInputEvent[] = [];

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
    if (type === EventType.SDL_EVENT_KEY_DOWN || type === EventType.SDL_EVENT_KEY_UP) {
      // SDL_KeyboardEvent: scancode@24, keycode@28, mod@32, repeat@39.
      const mod = eventView.getUint32(32, true);
      keyboardEvents.push({
        kind:
          type === EventType.SDL_EVENT_KEY_DOWN
            ? KeyboardInputKind.KeyDown
            : KeyboardInputKind.KeyUp,
        key: eventView.getUint32(28, true),
        // SDL_KMOD shift/ctrl/gui variants collapse to the toolkit bits.
        modifiers: ((
          ((mod & (SdlDefines.SDL_KMOD_LSHIFT | SdlDefines.SDL_KMOD_RSHIFT)) !== 0
            ? KeyModifiers.Shift
            : 0) |
          ((mod & (SdlDefines.SDL_KMOD_LCTRL | SdlDefines.SDL_KMOD_RCTRL)) !== 0
            ? KeyModifiers.Control
            : 0) |
          ((mod & (SdlDefines.SDL_KMOD_LGUI | SdlDefines.SDL_KMOD_RGUI)) !== 0
            ? KeyModifiers.Meta
            : 0)
        ) as KeyModifiers),
        repeat: eventView.getUint8(39) !== 0,
      });
    }
    if (type === EventType.SDL_EVENT_TEXT_INPUT) {
      // SDL_TextInputEvent: const char *text @ 24 — NUL-terminated UTF-8.
      const textPtr = eventView.getBigUint64(24, true);
      const text = readCString(textPtr);
      if (text) {
        keyboardEvents.push({
          kind: KeyboardInputKind.Char,
          key: 0,
          text,
          modifiers: 0,
        });
      }
    }
    if (type === EventType.SDL_EVENT_MOUSE_MOTION) {
      pointerEvents.push({
        kind: PointerInputKind.Move,
        x: eventView.getFloat32(28, true),
        y: eventView.getFloat32(32, true),
      });
    }
    if (
      (type === EventType.SDL_EVENT_MOUSE_BUTTON_DOWN ||
        type === EventType.SDL_EVENT_MOUSE_BUTTON_UP) &&
      eventView.getUint8(24) > 0
    ) {
      pointerEvents.push({
        kind:
          type === EventType.SDL_EVENT_MOUSE_BUTTON_DOWN
            ? PointerInputKind.Down
            : PointerInputKind.Up,
        x: eventView.getFloat32(28, true),
        y: eventView.getFloat32(32, true),
        button: eventView.getUint8(24) as MouseButton,
      });
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

  pointer.dispatch({ events: pointerEvents, root, layoutIndex });
  focusDispatcher.dispatch({
    pointerEvents,
    keyboardEvents,
    root,
    layoutIndex,
    focusableNodes: layoutCtx.focusableNodes,
  });
  pointerEvents.length = 0;
  keyboardEvents.length = 0;

  gpu.beginFrame();
  paintTree({
    gpu,
    font,
    statesOf: (node) => ({
      ...pointer.statesOf(node),
      ...focusDispatcher.statesOf(node),
    }),
  }, root);
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
