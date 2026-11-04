/**
 * vulcania Inspector Demo — a small interactive app with the devtools
 * inspector ALWAYS on, so you can poke the toolkit while it runs:
 *
 *   bun run examples/inspector.ts
 *   node examples/inspector.ts
 *
 * then open http://127.0.0.1:6060 — the widget tree (click a node: the
 * app draws a 2px accent outline around it), states + resolved style in
 * the details pane, and the per-window draw-call graph at the bottom.
 *
 *   bun run examples/inspector.ts --selftest   # 60-frame lifecycle check
 *
 * The tree has one of everything worth inspecting: controlled + live
 * widgets, a hover-fading button, an animated indeterminate bar (the
 * frame graph should tick steadily), a scroll box, and a 10k virtual
 * list — watch `nodes` stay near the window size, not the item count.
 */
import { App } from "@vulcania/app";
import type { ReconcilableWidget } from "@vulcania/core";
import { inspect } from "@vulcania/devtools";
import {
  FlexAlign,
  FlexDirection,
  Overflow,
  ProgressType,
} from "@vulcania/layout";
import {
  Button,
  Checkbox,
  Label,
  List,
  ProgressBar,
  SliderBar,
  TextArea,
  TextInput,
  Toggle,
  View,
} from "@vulcania/widgets";

const selftest = process.argv.includes("--selftest");

const ACCENT = "#e94560";
const SURFACE = "#0f3460";
const SURFACE_HOVER = "#1a4a7a";
const TEXT = "#ffffff";
const MUTED = "#888888";
const BACKDROP = { r: 13, g: 19, b: 33, a: 255 };

const state = {
  clicks: 0,
  checkbox: false,
  toggle: false,
  slider: 40,
  text: "inspect me",
  notes: "select nodes in the browser →",
};

const app = new App({
  title: "vulcania — inspector demo",
  width: 640,
  height: 520,
  backgroundColor: BACKDROP,
});

// The inspector is the point of this example — always on, loopback only.
const devtools = inspect(app, { port: 6060 });
console.log(`inspector → http://127.0.0.1:${devtools.port}`);

function row(...children: ReconcilableWidget[]): ReconcilableWidget {
  return View({
    style: {
      width: "100%",
      flexDirection: FlexDirection.Row,
      gap: 8,
      alignItems: FlexAlign.Center,
    },
    children,
  });
}

function caption(text: string): ReconcilableWidget {
  return Label({ text, style: { color: MUTED, width: "100%" } });
}

function buildTree(): ReconcilableWidget {
  return View({
    style: {
      width: "100%",
      height: "100%",
      flexDirection: FlexDirection.Column,
      gap: 10,
      padding: 16,
      overflow: Overflow.Scroll,
    },
    children: [
      Label({
        text: `Inspector demo — ${state.clicks} clicks`,
        style: { color: TEXT, width: "100%" },
      }),

      row(
        Button({
          children: [Label({ text: "Click me", style: { color: TEXT } })],
          onClick: () => {
            state.clicks++;
          },
          style: {
            width: 140,
            height: 36,
            backgroundColor: ACCENT,
            borderRadius: 8,
            _hover: { backgroundColor: SURFACE_HOVER },
          },
        }),
        Checkbox({
          checked: state.checkbox,
          onCheckedChange: (next) => {
            state.checkbox = next;
          },
        }),
        Toggle({
          checked: state.toggle,
          onCheckedChange: (next) => {
            state.toggle = next;
          },
        })
      ),

      caption("Slider → progress — drag and watch both in the detail pane"),
      SliderBar({
        value: state.slider,
        min: 0,
        max: 100,
        onChange: (next) => {
          state.slider = next;
        },
        style: { width: "100%", height: 24 },
      }),
      ProgressBar({
        value: state.slider,
        min: 0,
        max: 100,
        style: { width: "100%", height: 8, borderRadius: 4 },
      }),

      caption("Animated — the indeterminate bar keeps the frame graph moving"),
      ProgressBar({
        type: ProgressType.Indeterminate,
        style: { width: "100%", height: 6, borderRadius: 3 },
      }),

      caption("Text fields — live editing state, caret blink"),
      TextInput({
        value: state.text,
        onChange: (next) => {
          state.text = next;
        },
        style: { width: "100%", height: 30 },
      }),
      TextArea({
        value: state.notes,
        onChange: (next) => {
          state.notes = next;
        },
        style: { width: "100%", height: 64 },
      }),

      caption("Scroll box — wheel scrolls; children clip at the box"),
      View({
        style: {
          width: "100%",
          height: 90,
          flexDirection: FlexDirection.Column,
          gap: 4,
          padding: 8,
          backgroundColor: SURFACE,
          borderRadius: 8,
          overflow: Overflow.Scroll,
        },
        children: Array.from({ length: 12 }, (_, i) =>
          Label({ text: `scrollable line ${i + 1}` })
        ),
      }),

      caption("Virtual list — 10k items, only the window exists"),
      List({
        itemCount: 10_000,
        itemSize: 32,
        overscan: 4,
        renderItem: (i) =>
          Label({
            text: `List item ${i + 1}`,
            style: {
              width: "100%",
              height: 32,
              padding: 8,
              color: TEXT,
              _hover: { backgroundColor: SURFACE },
            },
          }),
        style: { width: "100%", height: 120 },
      }),
    ],
  });
}

await app.run((a) => {
  a.root.widget = buildTree();
  if (selftest && a.frames >= 60) a.quit();
});

// The samplers are live intervals — close the server so the process
// exits promptly instead of waiting on them.
await devtools.close();

console.log(`done after ${app.frames} frames`);
