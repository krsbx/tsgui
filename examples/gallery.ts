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
// Load something here (e.g. @vulcania/devtools/inject)
// import "@vulcania/devtools/inject";
//
// Loaded after the proper setup
import { App } from "@vulcania/app";
import { image, PixelFormat, sdl } from "@vulcania/bindings";
import { type ReconcilableWidget } from "@vulcania/core";
import { destroyTexture, rgba } from "@vulcania/gpu";
import {
  EasingName,
  FlexAlign,
  FlexDirection,
  Overflow,
  ProgressType,
  ProgressValueType,
} from "@vulcania/layout";
import {
  Button,
  Checkbox,
  CircularProgress,
  CircularSlider,
  Image,
  Label,
  Meter,
  Palette,
  ProgressBar,
  Radio,
  RadioGroup,
  RangeSlider,
  SliderBar,
  TextInput,
  Toggle,
  View,
} from "@vulcania/widgets";

const selftest = process.argv.includes("--selftest");

// --- app shell (SDL init, root window, renderer, font, event routing) ----
const app = new App({
  title: "vulcania — widget gallery",
  width: 1024,
  height: 640,
  backgroundColor: { r: 17, g: 24, b: 39, a: 255 }, // gray-900 backdrop
});
const gpu = app.root.renderer;
const font = app.root.font;

// Devtools inspector — opt-in: VULCANIA_DEVTOOLS=1 bun run examples/gallery.ts
// then open http://127.0.0.1:6060 (tree, selection, frame graph).
const devtools =
  process.env.VULCANIA_DEVTOOLS === "1"
    ? await import("@vulcania/devtools").then(({ inspect }) =>
        inspect(app, { port: 6060 })
      )
    : null;

// --- a real PNG, generated at runtime through SDL surfaces ----------------
const PNG_PATH = "/tmp/vulcania-gallery.png";
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

const photo = image.IMG_LoadTexture({
  renderer: gpu.renderer,
  file: PNG_PATH,
});
if (!photo) throw new Error("IMG_LoadTexture failed");

// --- widget tree ----------------------------------------------------------
// Rebuilt ONLY when app state changes; the reconciler keeps identity
// across rebuilds and short-circuits identical references entirely.

let clicks = 0;
let agree = false;
let wifi = true;
let flavor = "mint";
let volume = 65;
let tone = 30;
let priceLow = 20;
let priceHigh = 80;
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
      overflow: Overflow.Auto,
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
            text: "vulcania widget gallery",
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
              transition: {
                duration: 100,
                easing: EasingName.EaseIn,
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

      // uncontrolled controls — zero app state: the store + painter
      // handle everything (the version counter drives repaints)
      View({
        style: {
          flexDirection: FlexDirection.Row,
          gap: 24,
          alignItems: FlexAlign.Center,
        },
        children: [
          Checkbox({ defaultChecked: true }),
          Toggle({ defaultChecked: false }),
          TextInput({
            defaultValue: "editable",
            style: { width: 160, height: 28 },
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

      // range slider — two handles, nearest-handle picking, no crossing
      View({
        style: {
          flexDirection: FlexDirection.Column,
          gap: 8,
        },
        children: [
          Label({
            text: `price range: ${priceLow.toFixed(2)}–${priceHigh.toFixed(2)}`,
            style: { color: Palette.textMuted },
          }),
          RangeSlider({
            value: [priceLow, priceHigh],
            min: 0,
            max: 100,
            style: { width: 180, height: 24 },
            onChange: ([low, high]) => {
              priceLow = low;
              priceHigh = high;
              dirty = true;
            },
          }),
        ],
      }),

      // text input — focus via click, edit through the keyboard dispatch
      View({
        style: {
          flexDirection: FlexDirection.Row,
          gap: 12,
          alignItems: FlexAlign.Center,
        },
        children: [
          TextInput({
            value: name,
            placeholder: "Type your name…",
            measureText: (text) => font.measure(text).width,
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

      // scrollable box — wheel scrolls, content clips at the box
      View({
        style: {
          width: 320,
          height: 120,
          flexDirection: FlexDirection.Column,
          overflow: Overflow.Scroll,
          borderRadius: 8,
          backgroundColor: Palette.surface,
          gap: 4,
          padding: 8,
        },
        children: Array.from({ length: 12 }, (_, i) =>
          Label({ text: `scrollable line ${i + 1}` })
        ),
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
          boxShadow: { x: 0, y: 4, blur: 16, spread: 0, color: "#02061759" },
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
          ProgressBar({
            type: ProgressType.Indeterminate,
            style: { width: 120, height: 6, borderRadius: 3 },
          }),
          CircularProgress({ value: 0.66, min: 0, max: 1, size: 40 }),
          CircularProgress({ type: ProgressType.Indeterminate, size: 40 }),
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

// --- run through the app shell ---------------------------------------------
let tree = buildTree();

await app.run((a) => {
  if (dirty) {
    tree = buildTree(); // new descriptors — identity survives via reconcile
    dirty = false;
  }
  a.root.widget = tree;

  if (selftest && a.frames >= 240) a.quit();
});

// The inspector's samplers are live intervals — close it so the process
// exits promptly once the loop is done.
await devtools?.close();

destroyTexture(photo);

console.log(
  `gallery: ${app.frames} frames, ${app.root.layoutIndex.size} nodes, ok`
);
