# Rendering

## Model: batched SDL_RenderGeometry — JS writes vertices, SDL draws

The renderer (`GpuRenderer` in `@tsgui/gpu`) is a **geometry batcher** over
SDL3's `SDL_Renderer` GPU backend. JS writes typed-array vertices; the GPU
work is one `SDL_RenderGeometry` call per texture batch.

```
paint walk ──queue──▶ [vertexData: Uint8Array]  +  [indexData: Int32Array]
                          │ preallocated, reused, grown by doubling
                          ▼
       flushBatch() ──▶ SDL_RenderGeometry(renderer, batchTexture,
                                           verts, n, idxs, m)
       present()   ──▶ SDL_RenderPresent
```

Per frame the FFI count is constant **per texture batch**, not per
primitive: `SetRenderDrawColor`, `RenderClear`, one `RenderGeometry` per
batch, `RenderPresent` — plus event polling. Widgets only change the batch
count (one per distinct texture); untextured geometry shares one batch.

## Backend

`GpuRenderer` is constructed per window (`@tsgui/app` builds one per
AppWindow) — SDL textures are renderer-scoped, so fonts and image
textures are per-window too; nothing shares them across windows.

SDL_Renderer with the **GPU driver** (`SDL.renderer.create.name = "gpu"`,
SDL's Metal/D3D12/Vulkan abstraction), created through the properties API —
`SDL.renderer.create.window` must be set or the attempt silently fails and
the fallback picks SDL's default driver. `RendererOptions.driver` pins a
specific backend; tests pin `"software"` for deterministic pixel readback.

## Vertex format

SDL3's `SDL_Vertex` — 32 bytes, written through a `Float32Array` view:

```c
struct SDL_Vertex {     // 32 bytes
  float x, y;           // position, px, y-down, window space
  SDL_FColor color;     // r,g,b,a — packed u32 decoded to 4 floats
  float u, v;           // uv → texture; solid fills write (0,0)
};
```

The SDL2-era 20-byte layout with a packed-u32 color draws _nothing_ here —
SDL3 changed the struct and `SDL_RenderGeometry` takes a bare pointer, so
the mismatch fails silently (see CONVENTIONS: verify pixels, not return
codes). Shapes are **CPU-tessellated** into this format:

| Primitive              | Tessellation                                     |
| ---------------------- | ------------------------------------------------ |
| `fillRect`             | 4 verts, 2 tris                                  |
| `fillRoundedRect`      | center fan, 8 segments/corner                    |
| `fillArc` / `fillRing` | center fan / quad strip, density per full circle |
| `drawTexture`          | 4 verts, uv 0..1, white tint by default          |

## Batch discipline

`batchTexture` (null = untextured) decides where a primitive lands:

- untextured draws (`fillRect`, `fillRoundedRect`, `fillArc`, `fillRing`)
  flush an open **textured** batch first — a quad must never sample the
  previous batch's texture;
- `drawTexture` flushes on **any** texture change, including
  untextured → textured;
- `flushBatch()` resets the accumulation — without the reset, every later
  flush re-renders earlier quads under the newer batch's texture (the
  "tiled glyph noise" regression; guarded by pixel tests).

## Clipping

`SDL_SetRenderClipRect` push/pop around batch flush boundaries
(`pushClip`/`popClip` flush first — a clip change is a batch change).
`pushClip`/`popClip` are optional on the structural `Painter` surface;
the software-driver pixel tests exercise readback without needing them.

## Decoration layers

The generic engine (`@tsgui/paint`) paints per widget in flying-pan's
order: **shadow → border → background → widget content → children**:

- `primitives/shadow.ts` — stacked rounded-rect falloff layers (blur
  lands with the SDF spike);
- `primitives/shape.ts` — `fillShape` / `paintBorder` / `paintBackground`
  primitives (border ring under background fill: net stroke =
  borderWidth/2);
- `primitives/fill.ts` + `color-stops.ts` — value fills, continuous and
  stepped (segments + gaps), with threshold color stops;
- per-widget painters live in `@tsgui/widgets`, **co-located with their
  widget** (`widgets/<name>/paint.ts` — `progress/paint/*`, `slider/*`,
  `meter`, `checkbox`, `toggle`, `radio`, `text-input`, `label`, `image`)
  and are injected through `PaintContext.painters` — one file per
  concern, one registry assembly in `widgets/src/painters.ts`.

Labels paint one run per line when layout wrapped them
(`node.textLayout.lines`, stepped by the recorded `lineAdvance`);
unwrapped labels are a single run. The wrap itself is layout's job —
see LAYOUT.md.

## Text

The SDL3_ttf tier: white glyph runs rendered per unique string
(`TTF_RenderText_Blended`, length 0 = NUL-terminated), uploaded as
textures, tinted at draw, cached per string in the `TtfFont`. The
`TextPainter` surface adds optional `measure` (backed by
`TTF_GetStringSize`) which inline value labels and the text-input caret
math use. Caret blink waits for the AnimationManager (needs a clock).

## Text input

`TextInput`'s painter draws the live editing state
(`peekEditingState` — no controlled reconciliation; see the state module)
clipped to the field: placeholder when empty, selection highlight, text,
static caret. Focus comes from the focus dispatcher through
`PaintContext.statesOf`.

## Animation

`@tsgui/animation` owns the clock: `AnimationManager.tick(t)` runs each
frame, and the paint walk applies its overlay to any style declaring
`transition` — changed properties fade from the displayed value
(easing curves: linear/ease/ease-in/ease-out/ease-in-out; colors
interpolate in the packed u32 and re-format as `#rrggbbaa`, with
parse-normalized comparison so an interpolated color settles against a
differently-written target). The same clock drives the indeterminate
progress phases (bar 1500ms ease-in-out cycle, circular 2000ms sweep)
and the TextInput caret blink (500ms cadence). Without a manager in the
PaintContext everything paints static — headless tests stay
deterministic; `tick(now)` takes the time so tests drive it.

## Images

The SDL3_image tier: `IMG_LoadTexture` for files, runtime PNG via
`SDL_CreateSurface` + `SDL_SavePNG` → `IMG_LoadTexture` (the examples
generate their assets this way — no checked-in binaries).

## Pixel guard

Renderer behavior is pinned by **software-driver readback tests**
(`SDL_RenderReadPixels` + `SDL_ReadSurfacePixelFloat` on the software
driver, skipped on headless CI): red square, rounded corners, ring/pie
arcs, multi-batch isolation, and the text/selection/caret paints. The
op-count selftests cannot see pixels — two shipped regressions were
invisible to them.

## SDF spike (parked)

SDF rounded-rect/border/shadow via `SDL_SetGPURenderState` replaces the
stacked-layer shadows and CPU tessellation when the SDL_shadercross
toolchain is available — see the Phase 2.5 section in ROADMAP.md.
Everything needed is already bound.

## Canvas 2D / SVG (phase 5)

`CanvasContext` and the Path2D → tessellation port land with devtools
(phase 5). They feed the same vertex batches — geometry in TS, pixels via
SDL, vertices across the boundary.

## Perf (measured, Apple M-series)

| Scenario                             | Measured                                            |
| ------------------------------------ | --------------------------------------------------- |
| 10,000 solid rects + 1 textured quad | ~76–120 fps (GPU backend), ~2,000+ on other drivers |
| Gallery (48 nodes, 6 textures)       | 240-frame selftest, both runtimes                   |
| FFI calls per frame                  | constant per texture batch                          |
