/**
 * tsgui Dashboard — the Phase 4 exit gate: flying-pan's
 * `examples/simple-dashboard.ts` rebuilt on tsgui, interactive at 60fps.
 *
 * Same app shape as the original: a scrollable dashboard of sections
 * (Controls → Visuals → Live State) with the shared state read back
 * inline — flying-pan showed the readouts in a second window, which is
 * deferred here (multi-window), so the details panel renders below the
 * controls instead. Tessellation/Canvas/List sections land with phase 5.
 *
 * Everything on display exercises the phase 4 stack end to end:
 * controlled widgets → re-render → reconcile → layout, the pointer /
 * focus / scroll dispatchers, the transition engine (the text field
 * fades its border on focus, buttons fade their hover), and the
 * animation clock (indeterminate progress + spinner).
 *
 *   bun run examples/dashboard.ts --selftest   # exit after 240 frames
 *   node examples/dashboard.ts --selftest
 */
import { AnimationManager } from "@tsgui/animation";
import {
  EventType,
  image,
  PixelFormat,
  readCString,
  Scancode,
  sdl,
  SdlDefines,
} from "@tsgui/bindings";
import {
  KeyModifiers,
  type MouseButton,
  type ReconcilableWidget,
  StateStore,
} from "@tsgui/core";
import { destroyTexture, GpuRenderer, rgba, TtfFont } from "@tsgui/gpu";
import {
  FocusDispatcher,
  type KeyboardInputEvent,
  KeyboardInputKind,
  PointerDispatcher,
  type PointerInputEvent,
  PointerInputKind,
  ScrollDispatcher,
  type WheelInputEvent,
} from "@tsgui/interactions";
import {
  FlexAlign,
  FlexDirection,
  type LayoutContext,
  layoutFlex,
  type LayoutNode,
  Overflow,
  ProgressType,
  ProgressValueType,
} from "@tsgui/layout";
import { paintTree } from "@tsgui/paint";
import {
  Button,
  Checkbox,
  CircularProgress,
  Label,
  Meter,
  ProgressBar,
  Radio,
  RadioGroup,
  Reconciler,
  SliderBar,
  TextInput,
  Toggle,
  View,
  widgetPainters,
} from "@tsgui/widgets";

const selftest = process.argv.includes("--selftest");

// --- the flying-pan dashboard's palette ------------------------------------
const ACCENT = "#e94560";
const SURFACE = "#0f3460";
const SURFACE_HOVER = "#1a4a7a";
const TEXT = "#ffffff";
const MUTED = "#888888";
const DIVIDER = "#333333";

// --- shared state — mutated by handlers, read by buildTree ----------------
const state = {
  sliderValue: 50,
  checkboxChecked: false,
  toggleOn: false,
  textInputValue: "",
  flavor: "mint",
};

let dirty = true;

// --- window + renderer ----------------------------------------------------
if (!sdl.SDL_Init({ flags: SdlDefines.SDL_INIT_VIDEO })) {
  throw new Error(`SDL_Init failed: ${sdl.SDL_GetError()}`);
}

const window = sdl.SDL_CreateWindow({
  title: "tsgui — dashboard",
  w: 800,
  h: 600,
  flags: SdlDefines.SDL_WINDOW_RESIZABLE,
});
if (!window) throw new Error(`SDL_CreateWindow: ${sdl.SDL_GetError()}`);

if (!sdl.SDL_StartTextInput({ window })) {
  throw new Error(`SDL_StartTextInput: ${sdl.SDL_GetError()}`);
}

const gpu = new GpuRenderer(window);
gpu.clearColor = { r: 13, g: 19, b: 33, a: 255 }; // BACKDROP

const FONT_PATHS = [
  process.env.TSGUI_FONT_PATH,
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
].filter((p): p is string => !!p);
const font = new TtfFont(gpu.renderer, FONT_PATHS[0]!, 18);

// --- a header image, generated at runtime through SDL surfaces -----------
const PNG_PATH = "/tmp/tsgui-dashboard.png";
{
  const surface = sdl.SDL_CreateSurface({
    width: 220,
    height: 64,
    format: PixelFormat.SDL_PIXELFORMAT_RGBA32,
  });
  if (!surface) throw new Error(`SDL_CreateSurface: ${sdl.SDL_GetError()}`);
  sdl.SDL_FillSurfaceRect({
    dst: surface,
    rect: null,
    color: rgba({ r: 22, g: 33, b: 62 }),
  });
  for (let i = 0; i < 5; i++) {
    const rect = new Int32Array([12 + i * 42, 12, 26, 40]);
    sdl.SDL_FillSurfaceRect({
      dst: surface,
      rect,
      color: rgba({ r: 233, g: 69, b: 96 }),
    });
  }
  if (!sdl.SDL_SavePNG({ surface, file: PNG_PATH })) {
    throw new Error(`SDL_SavePNG: ${sdl.SDL_GetError()}`);
  }
  sdl.SDL_DestroySurface({ surface });
}

const headerTexture = image.IMG_LoadTexture({
  renderer: gpu.renderer,
  file: PNG_PATH,
});
if (!headerTexture) throw new Error(`IMG_LoadTexture: ${sdl.SDL_GetError()}`);

// --- widget tree ----------------------------------------------------------

function divider(): ReconcilableWidget {
  return View({
    style: {
      width: "100%",
      height: 1,
      backgroundColor: DIVIDER,
      margin: 8,
    },
  });
}

function sectionTitle(text: string): ReconcilableWidget {
  return Label({ text, style: { color: ACCENT, width: "100%" } });
}

function buildTree(): ReconcilableWidget {
  return View({
    style: {
      width: "100%",
      height: "100%",
      flexDirection: FlexDirection.Column,
      overflow: Overflow.Auto,
      padding: 16,
      gap: 8,
    },
    children: [
      // header ------------------------------------------------------------
      View({
        style: {
          flexDirection: FlexDirection.Row,
          alignItems: FlexAlign.Center,
          gap: 16,
        },
        children: [
          Label({
            text: "tsgui Dashboard",
            style: { color: ACCENT, width: "100%" },
          }),
          Label({
            text: "flying-pan's simple-dashboard, rebuilt",
            style: { color: MUTED, width: "100%" },
          }),
        ],
      }),

      // controls ----------------------------------------------------------
      divider(),
      sectionTitle("Controls"),

      SliderBar({
        value: state.sliderValue,
        min: 0,
        max: 100,
        onChange: (value) => {
          state.sliderValue = value;
          dirty = true;
        },
        style: { width: "100%", height: 24 },
        colorStops: [
          { at: 0, color: ACCENT },
          { at: 50, color: "#fca5a5" },
          { at: 100, color: "#ffffff" },
        ],
      }),

      TextInput({
        value: state.textInputValue,
        placeholder: "Type something...",
        onChange: (text) => {
          state.textInputValue = text;
          dirty = true;
        },
        style: {
          width: "100%",
          height: 48,
          backgroundColor: SURFACE,
          borderColor: ACCENT,
          borderWidth: 2,
          borderRadius: 4,
          color: TEXT,
          placeholderColor: "#555555",
          _focus: { borderColor: "#ffffff" },
          transition: { property: "borderColor", duration: 200 },
        },
      }),

      View({
        style: {
          flexDirection: FlexDirection.Row,
          gap: 16,
          alignItems: FlexAlign.Center,
        },
        children: [
          Checkbox({
            checked: state.checkboxChecked,
            onCheckedChange: (next) => {
              state.checkboxChecked = next;
              dirty = true;
            },
          }),
          Label({ text: "Checkbox", style: { color: TEXT } }),
          Toggle({
            checked: state.toggleOn,
            onCheckedChange: (next) => {
              state.toggleOn = next;
              dirty = true;
            },
          }),
          Label({ text: "Toggle", style: { color: TEXT } }),
        ],
      }),

      RadioGroup({
        value: state.flavor,
        onValueChange: (next) => {
          state.flavor = next;
          dirty = true;
        },
        children: [
          Radio({ value: "mint", label: "Mint" }),
          Radio({ value: "berry", label: "Berry" }),
        ],
      }),

      // visuals -----------------------------------------------------------
      divider(),
      sectionTitle("Visuals"),

      Label({
        text: "Indeterminate progress (animated on the clock)",
        style: { color: MUTED, width: "100%" },
      }),

      ProgressBar({
        type: ProgressType.Indeterminate,
        style: { width: "100%", height: 6, borderRadius: 3 },
      }),

      CircularProgress({
        value: state.sliderValue,
        min: 0,
        max: 100,
        size: 96,
        thickness: 0.15,
        label: `${state.sliderValue}%`,
        style: { backgroundColor: "transparent" },
      }),

      Meter({
        value: state.sliderValue,
        min: 0,
        max: 100,
        low: 25,
        high: 75,
        optimum: 90,
        style: { width: "100%", height: 6 },
        showValue: ProgressValueType.Percent,
      }),

      // live state (flying-pan's details window, inline) ------------------
      divider(),
      sectionTitle("Live State"),

      View({
        style: {
          width: "100%",
          flexDirection: FlexDirection.Column,
          gap: 6,
          padding: 12,
          borderRadius: 8,
          backgroundColor: SURFACE,
        },
        children: [
          Label({
            text: `Text: ${state.textInputValue || "(empty)"}`,
            style: { color: TEXT },
          }),
          Label({
            text: `Checkbox: ${state.checkboxChecked ? "on" : "off"}`,
            style: { color: TEXT },
          }),
          Label({
            text: `Toggle: ${state.toggleOn ? "on" : "off"}`,
            style: { color: TEXT },
          }),
          Label({ text: `Flavor: ${state.flavor}`, style: { color: TEXT } }),
          Label({
            text: `Slider: ${state.sliderValue}`,
            style: { color: MUTED },
          }),
        ],
      }),

      View({
        style: {
          width: "100%",
          flexDirection: FlexDirection.Row,
          gap: 12,
          alignItems: FlexAlign.Center,
        },
        children: [
          Button({
            children: [Label({ text: "No-op (hover fades)" })],
            onClick: () => {
              dirty = true;
            },
            style: {
              height: 40,
              backgroundColor: SURFACE,
              borderRadius: 8,
              _hover: { backgroundColor: SURFACE_HOVER },
              _active: { backgroundColor: ACCENT },
              transition: { property: "backgroundColor", duration: 200 },
            },
          }),
          Label({
            text: "Multi-window lands with the deferred window work",
            style: { color: MUTED },
          }),
        ],
      }),
    ],
  });
}

// --- reconciler + layout context -------------------------------------------
const stateStore = new StateStore();
const reconciler = new Reconciler(stateStore);
const animationManager = new AnimationManager();

let tree = buildTree();

const layoutIndex = new Map<number, LayoutNode>();
const layoutCtx: LayoutContext = {
  layoutIndex,
  focusableNodes: [],
  scrollOffsetOf: (node) => scrollDispatcher.offset(node),
  getStableId: reconciler.getStableId,
  measureText: (text) => font.measure(text),
  getImageSize: () => null,
};

// --- dispatchers -----------------------------------------------------------
const pointer = new PointerDispatcher();
const focusDispatcher = new FocusDispatcher();
const scrollDispatcher = new ScrollDispatcher();
const pointerEvents: PointerInputEvent[] = [];
const keyboardEvents: KeyboardInputEvent[] = [];
const wheelEvents: WheelInputEvent[] = [];

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
    if (
      type === EventType.SDL_EVENT_KEY_DOWN ||
      type === EventType.SDL_EVENT_KEY_UP
    ) {
      const mod = eventView.getUint32(32, true);
      keyboardEvents.push({
        kind:
          type === EventType.SDL_EVENT_KEY_DOWN
            ? KeyboardInputKind.KeyDown
            : KeyboardInputKind.KeyUp,
        key: eventView.getUint32(28, true),
        modifiers: (((mod &
          (SdlDefines.SDL_KMOD_LSHIFT | SdlDefines.SDL_KMOD_RSHIFT)) !==
        0
          ? KeyModifiers.Shift
          : 0) |
          ((mod & (SdlDefines.SDL_KMOD_LCTRL | SdlDefines.SDL_KMOD_RCTRL)) !== 0
            ? KeyModifiers.Control
            : 0) |
          ((mod & (SdlDefines.SDL_KMOD_LGUI | SdlDefines.SDL_KMOD_RGUI)) !== 0
            ? KeyModifiers.Meta
            : 0)) as KeyModifiers,
        repeat: eventView.getUint8(39) !== 0,
      });
    }
    if (type === EventType.SDL_EVENT_TEXT_INPUT) {
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
    if (type === EventType.SDL_EVENT_MOUSE_WHEEL) {
      wheelEvents.push({
        scrollX: eventView.getFloat32(24, true),
        scrollY: eventView.getFloat32(28, true),
        mouseX: eventView.getFloat32(36, true),
        mouseY: eventView.getFloat32(40, true),
      });
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

  pointer.dispatch({ events: pointerEvents, root, layoutIndex, stateStore });
  focusDispatcher.dispatch({
    pointerEvents,
    keyboardEvents,
    root,
    layoutIndex,
    focusableNodes: layoutCtx.focusableNodes,
    stateStore,
  });
  scrollDispatcher.dispatch({
    wheelEvents,
    root,
    layoutIndex,
    time: performance.now(),
  });
  animationManager.tick(performance.now());
  pointerEvents.length = 0;
  keyboardEvents.length = 0;
  wheelEvents.length = 0;

  gpu.beginFrame();
  paintTree(
    {
      gpu,
      font,
      statesOf: (node) => ({
        ...pointer.statesOf(node),
        ...focusDispatcher.statesOf(node),
      }),
      stateStore,
      painters: widgetPainters,
      animationManager,
    },
    root
  );
  gpu.present();

  frames++;
  if (selftest && frames >= 240) running = false;
  sdl.SDL_Delay({ ms: 16 });
}

destroyTexture(headerTexture);
font.destroy();
gpu.destroy();
sdl.SDL_DestroyWindow({ window });
sdl.SDL_Quit();

console.log(`dashboard: ${frames} frames, ${layoutIndex.size} nodes, ok`);
