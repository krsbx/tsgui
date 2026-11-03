/**
 * Flex factory — the direction/gap/justify/align shortcuts lower into
 * the style object and flow through the generic layoutFlex pass; a user
 * `style` wins any conflict with the lifted props.
 */
import { FlexAlign, FlexDirection, FlexJustify, WidgetType } from "@vulcania/layout";
import type { LayoutNode } from "@vulcania/layout";
import { describe, expect, test } from "bun:test";
import { Flex, Label, renderHeadless } from "../src/index.ts";

const label = (text: string, style: { width: number; height: number }): ReturnType<typeof Label> =>
  Label({ text, style });

describe("Flex factory", () => {
  test("emits the Flex widget type", () => {
    const frame = renderHeadless(
      Flex({ direction: FlexDirection.Row, children: [] }),
      { width: 100, height: 100 }
    );
    expect(frame.root.widget.type).toBe(WidgetType.Flex);
  });

  test("row + gap spaces children along x", () => {
    const frame = renderHeadless(
      Flex({
        direction: FlexDirection.Row,
        gap: 8,
        style: { width: 200, height: 50 },
        children: [label("a", { width: 60, height: 20 }), label("b", { width: 60, height: 20 })],
      }),
      { width: 200, height: 50 }
    );

    const a = frame.root.children[0]! as LayoutNode;
    const b = frame.root.children[1]! as LayoutNode;
    expect(b.x).toBe(a.x + 60 + 8);
    expect(b.y).toBe(a.y);
  });

  test("column + justifyContent Center centers on the main axis", () => {
    const frame = renderHeadless(
      Flex({
        direction: FlexDirection.Column,
        justifyContent: FlexJustify.Center,
        style: { width: 100, height: 90 },
        children: [label("a", { width: 60, height: 20 })],
      }),
      { width: 100, height: 90 }
    );

    const a = frame.root.children[0]! as LayoutNode;
    expect(a.y).toBe((90 - 20) / 2);
  });

  test("alignItems Center centers on the cross axis", () => {
    const frame = renderHeadless(
      Flex({
        direction: FlexDirection.Row,
        alignItems: FlexAlign.Center,
        style: { width: 200, height: 90 },
        children: [label("a", { width: 60, height: 20 })],
      }),
      { width: 200, height: 90 }
    );

    const a = frame.root.children[0]! as LayoutNode;
    expect(a.y).toBe((90 - 20) / 2);
  });

  test("user style wins over the lifted direction prop", () => {
    const frame = renderHeadless(
      Flex({
        direction: FlexDirection.Row,
        style: { flexDirection: FlexDirection.Column, width: 100, height: 100 },
        children: [label("a", { width: 60, height: 20 }), label("b", { width: 60, height: 20 })],
      }),
      { width: 100, height: 100 }
    );

    // Column wins → children stack on y at the same x.
    const a = frame.root.children[0]! as LayoutNode;
    const b = frame.root.children[1]! as LayoutNode;
    expect(b.x).toBe(a.x);
    expect(b.y).toBe(a.y + 20);
  });
});
