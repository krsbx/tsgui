/**
 * vulcania Dashboard — flying-pan's `examples/simple-dashboard.ts` rebuilt
 * on vulcania, multi-window restored. The main window is the scrollable
 * controls/visuals dashboard; the button opens a real second Details
 * window (live state readouts + window info) exactly like the original —
 * opened by the button, closed by its Close button or the window's ✕.
 *
 * The app shell (@vulcania/app) owns SDL, the window registry, event
 * decode + routing, and the run loop; this file only builds widget
 * trees and mutates shared state — the phase 4 exit gate in its final
 * shape.
 *
 *   bun run examples/dashboard.ts --selftest   # lifecycle selftest
 *   node examples/dashboard.ts --selftest
 *
 * The selftest drives the window lifecycle: Details opens at frame 30,
 * closes at 120, reopens at 180, exits at 240.
 */
import { App, type AppWindow } from "@vulcania/app";
import { type ReconcilableWidget } from "@vulcania/core";
import {
  FlexAlign,
  FlexDirection,
  ListOrientation,
  Overflow,
  ProgressType,
  ProgressValueType,
} from "@vulcania/layout";
import {
  Button,
  Checkbox,
  CircularProgress,
  Label,
  List,
  Meter,
  ProgressBar,
  Radio,
  RadioGroup,
  SliderBar,
  TextArea,
  TextInput,
  Toggle,
  View,
} from "@vulcania/widgets";

const selftest = process.argv.includes("--selftest");

// --- the flying-pan dashboard's palette ------------------------------------
const ACCENT = "#e94560";
const SURFACE = "#0f3460";
const SURFACE_HOVER = "#1a4a7a";
const TEXT = "#ffffff";
const MUTED = "#888888";
const DIVIDER = "#333333";
const DETAILS_BG = { r: 22, g: 33, b: 62, a: 255 }; // #16213e
const BACKDROP = { r: 13, g: 19, b: 33, a: 255 };

// --- shared state — mutated by handlers, read by both trees ---------------
const state = {
  sliderValue: 50,
  checkboxChecked: false,
  toggleOn: false,
  textInputValue: "",
  notes: "vulcania notes:\n- zero C\n- multi-window",
  flavor: "mint",
};

let details: AppWindow | null = null;

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

/** One virtual-list row — flying-pan's item style, hover + fade included. */
function listItem(i: number): ReconcilableWidget {
  return Label({
    text: `List item ${i + 1}`,
    font: "default",
    style: {
      color: TEXT,
      width: "100%",
      height: 36,
      padding: 8,
      _hover: { backgroundColor: "#16213e" },
      transition: { property: "backgroundColor", duration: 150 },
    },
  });
}

function sectionTitle(text: string): ReconcilableWidget {
  return Label({ text, style: { color: ACCENT, width: "100%" } });
}

// --- the dashboard window --------------------------------------------------

function buildDashboard(app: App): ReconcilableWidget {
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
            text: "vulcania Dashboard",
            font: "display",
            style: { color: ACCENT, width: "100%" },
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
        measureText: (text) => app.root.font.measure(text).width,
        onChange: (text) => {
          state.textInputValue = text;
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

      TextArea({
        value: state.notes,
        placeholder: "Notes...",
        measureText: (text) => app.root.font.measure(text).width,
        onChange: (text) => {
          state.notes = text;
        },
        style: {
          width: "100%",
          height: 96,
          lineHeight: 22,
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
            },
          }),
          Label({ text: "Checkbox", style: { color: TEXT } }),
          Toggle({
            checked: state.toggleOn,
            onCheckedChange: (next) => {
              state.toggleOn = next;
            },
          }),
          Label({ text: "Toggle", style: { color: TEXT } }),
        ],
      }),

      RadioGroup({
        value: state.flavor,
        onValueChange: (next) => {
          state.flavor = next;
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

      // virtual lists -------------------------------------------------------
      divider(),
      sectionTitle("Virtual Lists"),

      Label({
        text: "Two 10,000-item lists — only the visible window exists per frame",
        style: { color: MUTED, width: "100%" },
      }),

      List({
        itemCount: 10_000,
        itemSize: 36,
        overscan: 5,
        renderItem: listItem,
        style: { width: "100%", height: 70 },
      }),

      List({
        itemCount: 10_000,
        itemSize: 250,
        overscan: 5,
        orientation: ListOrientation.Horizontal,
        renderItem: listItem,
        style: { width: "100%", height: 70 },
      }),

      // multi-window ------------------------------------------------------
      divider(),
      sectionTitle("Multi-Window"),

      Button({
        children: [
          Label({
            text:
              details !== null
                ? "Details window is open"
                : "Open Details Window",
            style: { color: TEXT },
          }),
        ],
        onClick: () => {
          if (details !== null) {
            app.destroyWindow(details);
            details = null;
          } else {
            details = app.createWindow({
              title: "Details",
              width: 400,
              height: 500,
              backgroundColor: DETAILS_BG,
            });
            const root = app.root.position;
            details.move({ x: root.x + 820, y: root.y });
          }
        },
        style: {
          width: "100%",
          height: 40,
          backgroundColor: SURFACE,
          borderRadius: 8,
          alignItems: FlexAlign.Center,
          justifyContent: FlexAlign.Center,
          opacity: details !== null ? 0.5 : 1,
          _hover: { backgroundColor: SURFACE_HOVER },
          _active: { backgroundColor: ACCENT },
          transition: { property: "backgroundColor", duration: 200 },
        },
      }),

      Label({
        text: "flying-pan's simple-dashboard, rebuilt",
        style: { color: MUTED, width: "100%" },
      }),
    ],
  });
}

// --- the details window ----------------------------------------------------

function buildDetails(win: AppWindow): ReconcilableWidget {
  const pos = win.position;
  const size = win.size;
  const input = state.textInputValue || "(empty)";

  return View({
    style: {
      width: "100%",
      height: "100%",
      flexDirection: FlexDirection.Column,
      overflow: Overflow.Auto,
      padding: 16,
      gap: 12,
    },
    children: [
      View({
        style: {
          width: "100%",
          flexDirection: FlexDirection.Row,
          gap: 8,
          alignItems: FlexAlign.Center,
        },
        children: [
          Label({ text: "Details", style: { color: ACCENT } }),
          Button({
            children: [Label({ text: "Close", style: { color: TEXT } })],
            onClick: () => {
              app.destroyWindow(win);
              details = null;
            },
            style: {
              width: 80,
              height: 32,
              backgroundColor: SURFACE,
              borderRadius: 6,
              _hover: { backgroundColor: SURFACE_HOVER },
              _active: { backgroundColor: ACCENT },
              transition: { property: "backgroundColor", duration: 150 },
            },
          }),
        ],
      }),

      divider(),
      sectionTitle("Live State"),

      CircularProgress({
        value: state.sliderValue,
        min: 0,
        max: 100,
        size: 96,
        thickness: 0.15,
        label: `${state.sliderValue}%`,
        style: { backgroundColor: "transparent" },
      }),

      Label({ text: `Text: ${input}`, style: { color: TEXT } }),
      Label({
        // Newlines render as spaces in a single label — make the live
        // line breaks visible in the readout.
        text: `Notes: ${state.notes.replaceAll("\n", " ⏎ ")}`,
        style: { color: TEXT, width: "100%" },
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

      divider(),
      sectionTitle("Window Info"),

      Label({
        text: `Position: ${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}`,
        style: { color: MUTED },
      }),
      Label({
        text: `Size: ${size.width} × ${size.height}`,
        style: { color: MUTED },
      }),
    ],
  });
}

// --- the app ---------------------------------------------------------------

const displayFontPath =
  process.platform === "darwin"
    ? "/System/Library/Fonts/Helvetica.ttc"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const app = new App({
  title: "vulcania — dashboard",
  width: 800,
  height: 600,
  backgroundColor: BACKDROP,
  fonts: {
    // default: { path: process.env.VULCANIA_FONT_PATH ?? displayFontPath, size: 18 },
    display: { path: displayFontPath, size: 28 },
  },
});

// Devtools inspector — opt-in: VULCANIA_DEVTOOLS=1 bun run examples/dashboard.ts
// then open http://127.0.0.1:6060 (tree, selection, frame graph).
const devtools =
  process.env.VULCANIA_DEVTOOLS === "1"
    ? await import("@vulcania/devtools").then(({ inspect }) =>
        inspect(app, { port: 6060 })
      )
    : null;

let lastNodes = 0;

await app.run((a) => {
  // The trees rebuild every frame; the reconciler short-circuits
  // identical references, so unchanged frames cost a diff walk only.
  a.root.widget = buildDashboard(a);
  if (details !== null) {
    details.widget = buildDetails(details);
  }

  lastNodes = a.root.layoutIndex.size;

  if (selftest) {
    // Lifecycle: open → render → close → reopen → exit.
    if (a.frames === 30 && details === null) {
      details = a.createWindow({
        title: "Details",
        width: 400,
        height: 500,
        backgroundColor: DETAILS_BG,
      });
      const root = a.root.position;
      details.move({ x: root.x + 820, y: root.y });
    }
    if (a.frames === 120 && details !== null) {
      a.destroyWindow(details);
      details = null;
    }
    if (a.frames === 180 && details === null) {
      details = a.createWindow({
        title: "Details",
        width: 400,
        height: 500,
        backgroundColor: DETAILS_BG,
      });
    }
    if (a.frames >= 240) a.quit();
  }
});

// The inspector's samplers are live intervals — close it so the process
// exits promptly once the loop is done.
await devtools?.close();

console.log(`dashboard: ${app.frames} frames, ${lastNodes} nodes (root), ok`);
