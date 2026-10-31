/**
 * Golden snapshots over the headless pipeline — the phase 3 exit gate.
 * The .snap file is committed; CI compares instead of writing.
 */
import { describe, expect, test } from "bun:test";
import { FlexAlign, FlexDirection } from "@tsgui/layout";
import {
  Button,
  Image,
  Label,
  renderHeadless,
  Reconciler,
  serializeLayoutTree,
  StateStore,
  View,
  type ReconcilableWidget,
} from "../src/index.ts";

const GALLERY: ReconcilableWidget = View({
  style: {
    width: 800,
    height: 600,
    flexDirection: FlexDirection.Column,
    padding: 24,
    gap: 16,
    backgroundColor: "#111827",
  },
  children: [
    View({
      style: {
        flexDirection: FlexDirection.Row,
        alignItems: FlexAlign.Center,
        gap: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#3b82f6",
      },
      children: [Label({ text: "tsgui widget gallery" })],
    }),
    Label({ text: "clicked 0 times", style: { color: "#6b7280" } }),
    Button({ children: [Label({ text: "Default" })] }),
    View({
      style: {
        width: 360,
        padding: 20,
        borderRadius: 12,
        backgroundColor: "#ffffff",
        boxShadow: { x: 0, y: 8, blur: 24, spread: 0, color: "#020617aa" },
      },
      children: [
        Label({ text: "Card title" }),
        Label({ text: "Body copy.", style: { color: "#6b7280" } }),
      ],
    }),
    Image({ src: "gallery.png", style: { width: 128, height: 96 } }),
  ],
});

describe("headless harness", () => {
  test("layout tree snapshot", () => {
    const frame = renderHeadless(GALLERY, { width: 800, height: 600 });
    expect(serializeLayoutTree(frame.root)).toMatchSnapshot();
  });

  test("paint ops snapshot (shadow → border → background → widgets)", () => {
    const frame = renderHeadless(GALLERY, { width: 800, height: 600 });
    expect(frame.ops).toMatchSnapshot();
    expect(frame.changed).toBe(true);
  });

  test("hovered pseudo-state merges into the recorded ops", () => {
    const base = renderHeadless(GALLERY, { width: 800, height: 600 });

    // The Button factory returns the descriptor itself — find its stableId.
    let buttonId = 0;
    for (const node of base.layoutIndex.values()) {
      if (node.widget.type === "Button") buttonId = node.stableId;
    }
    expect(buttonId).not.toBe(0);

    const hovered = renderHeadless(GALLERY, {
      width: 800,
      height: 600,
      statesOf: (node) => ({
        hovered: node.stableId === buttonId,
        pressed: false,
        focused: false,
        checked: false,
        disabled: false,
      }),
    });

    expect(hovered.ops).toMatchSnapshot();
  });

  test("identity survives a rebuild and short-circuits a re-render", () => {
    const store = new StateStore();
    const reconciler = new Reconciler(store);

    const first = reconciler.reconcile(GALLERY);
    reconciler.reconcile(GALLERY);
    expect(reconciler.changed).toBe(false);

    // Same structure, fresh descriptors — identity must survive.
    const rebuilt = View({ ...GALLERY });
    const next = reconciler.reconcile(rebuilt);
    expect(reconciler.changed).toBe(true);
    expect(next.stableId).toBe(first.stableId);
  });
});
