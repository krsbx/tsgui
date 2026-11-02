# Layout Engine

Package: `@tsgui/layout` — ported from flying-pan's layout subsystem
(~1,400 lines, 17 files) with one decisive change: **layout no longer
depends on the renderer.**

## The decoupling

flying-pan aliased `LayoutContext = PaintContext`, which dragged the
renderer, font manager, and interaction managers into every layout call —
the reason layout could not be tested without a window and a GPU.

tsgui's `LayoutContext` is minimal and injected:

```ts
interface LayoutContext {
  getStableId(widget: WidgetDescriptor): number;
  /** stableId → node, populated pre-order during layoutFlex. */
  layoutIndex: Map<number, LayoutNode>;
  focusableNodes: LayoutNode[];
  /** Committed scroll offset of a scrollable node (previous frame). */
  scrollOffsetOf(node: LayoutNode): Coordinate2D;
  /** Intrinsic text measurement — ttf tier in production, stubs in tests. */
  measureText(text: string, style: unknown): Size;
  /** Intrinsic image size from decoded metadata (null = unknown). */
  getImageSize(src: string): Size | null;
}
```

Production wiring (ttf measurement, the scroll dispatcher) happens in the
app layer; headless tests stub it in ten lines. The ESLint boundary rule
forbids this package from importing `@tsgui/bindings` or `@tsgui/platform`.

## Semantics (differences from naive expectations)

These are flying-pan semantics, preserved faithfully and codified in
`packages/layout/test/layout.test.ts`:

- **Child x/y accumulate the parent's position.** `positionFlowChildren`
  calls `layoutFlex` with `x: parent.x + childX`, so a child's stored `x`
  is the parent's absolute x plus its relative offset — _excluding_ scroll.
- **`screenX`/`screenY` add ancestor scroll.** Threaded via
  `scrollAccumulated` through flow/wrap/absolute during `layoutFlex`, not a
  separate post-pass. Read these for pointer hit-testing and clipping;
  read `x`/`y` for content-space math (scroll bounds, virtualization).
- **One-frame latency.** `scrollOffsetOf` returns the previous frame's
  committed offsets — same as flying-pan's `ScrollDispatcher.offsets`.
- **Absolute children read `left`/`top`/`right`/`bottom`** — not `x`/`y`.
- **Flow advancing uses actual laid-out sizes**, so siblings after a
  content-fitted container space correctly.
- **List virtualization** generates visible items + overscan + spacers with
  negative synthetic stableIds (`-(listStableId * 100_001 + slot + 1)`),
  invisible to the reconciler. Spacers keep content-fit correct for scroll
  bounds.

## Engine map

| File                | Job                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `layout.ts`         | `layoutFlex` — resolve dims → content box → register node → processor hook → measure children → content-fit → flow/wrap/absolute                                                                                                                       |
| `flow.ts`           | Positions flow children along the main axis (justify/align/flex-grow), recursing via `layoutFlex`                                                                                                                                                      |
| `wrap.ts`           | Line breaking + per-line layout for `flexWrap: wrap`                                                                                                                                                                                                   |
| `absolute.ts`       | `left`/`top`/`right`/`bottom` positioning against the padding box                                                                                                                                                                                      |
| `measurement.ts`    | Child measurement (flow vs absolute + content-fit aggregates) + wrap measurement + justify calculation. Auto-sized containers measure **recursively** — intrinsic size is bottom-up content size (web model), so nested auto containers never collapse |
| `calculator.ts`     | flex-grow distribution and flex-shrink                                                                                                                                                                                                                 |
| `utility.ts`        | Main-axis clamp + cross-axis fill, fused with totals accumulation                                                                                                                                                                                      |
| `resolver.ts`       | Per-widget intrinsic size: Label/Button via injected `measureText` (+ text wrapping, below), Image via props/injected metadata, default from style                                                                                                     |
| `text-wrap.ts`      | `wrapText` — greedy word packing with character breaks for overlong words; the per-descriptor frame cache handing wrapped lines to `LayoutNode.textLayout`                                                                                             |
| `processor/list.ts` | List virtualization + the `widgetLevelLayoutFlex` hook pattern                                                                                                                                                                                         |

Adding a widget-specific processor = one `case` in the hook + one file.

## Text wrapping

Labels follow the web text model (**default on**): when a label's natural
run is wider than the width available to it — the parent content width,
intersected with an explicit `maxWidth` — it wraps into lines that fit.
The wrapped block fills that width; height grows to `lines × lineAdvance`
(`lineHeight` if set, otherwise the measured single-line height). Lines
are computed once at measure time, recorded per descriptor in a
same-frame cache, and attached to the node as `textLayout` — the painter
draws one run per line and never re-wraps, so lines and measured height
cannot disagree. `textWrap: TextWrap.NoWrap` opts out to a single
overflowing run (flying-pan's old behavior). Buttons wrap free — their
label is a child Label.

## Style model

`ViewStyle` is the shared contract between layout and paint — box model,
flex, position, plus the visual fields (`backgroundColor`, `border`,
`boxShadow`, …) that layout ignores and the paint layer reads. Pseudo-state
fields (`_hover`, `_focus`, …) are data; the dispatch that applies them is
Phase 4. `transition` is omitted until the animation phase.

## Testing

Headless — no window, no GPU, no FFI:

```bash
bun test packages/layout
```

The test context stubs the six `LayoutContext` members (counter stableIds,
zero scroll offsets, `text.length × 10` measurement). See
`packages/layout/test/layout.test.ts` for the eight semantic tests.
