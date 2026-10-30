# Rendering

## Model: retained tree in, vertex buffer out

The renderer is a **frame encoder**, not a draw-call walker. Everything JS
knows how to draw becomes typed-array writes; the GPU work is one FFI call.

```
LayoutNode tree ──encode──▶ [Vertex; N] + [u32; M] + [Batch; k]
                                   │  preallocated ArrayBuffers, reused
                                   ▼
                    tsgui_window_render(h, verts, n, idxs, m, batches, k)
                                   │
                                   ▼
        native (SDL_GPU): transfer-buffer upload → copy to GPU vertex/index
        buffers → command buffer → render pass → k draw calls → submit+present
```

This replaces flying-pan's per-primitive `glBegin/glEnd` (the throughput
ceiling called out in its own docs). Throughput stops depending on widget
count and starts depending only on vertex count.

## GPU backend

SDL_GPU (see PLATFORM.md) with one pipeline set — solid / atlas / SDF
dispatched by the vertex `flags` byte. Shaders are authored in HLSL and
cross-compiled offline with SDL_shadercross to SPIR-V / DXIL / MSL; compiled
blobs are checked in and loaded at init. Backends: Metal (macOS), D3D12
(Windows), Vulkan (Linux). No GL fallback — v1 desktop targets only.

## Vertex format

16 bytes, packed, interleaved — chosen so one shader handles everything v1:

```c
struct Vertex {        // 16 bytes
  float x, y;          // position, px, y-down, window space
  float u, v;          // uv → font atlas / image / SDF mask
  uint8 r, g, b, a;    // color, sRGB assumed
  uint8 flags;         // kind: solid | image | text | sdf-rect
  uint8 pad[3];
};
```

`(u,v)` is overloaded by `kind`: solid ignores it, image/text sample the
atlas, `sdf-rect` feeds the rounded-rect SDF (corner radius, border width and
shadow params ride in a small per-batch uniform or a second attribute stream).

## Shapes: SDF, not tessellation

Rounded rects, borders, shadows — the 95% case of widget chrome — are drawn
as one quad each through an **SDF fragment shader** (the classic single
rounded-box SDF; borders/shadows are derived from the same distance value).
Consequences:

- one quad + one shader per decorated box, versus flying-pan's
  border-as-4-quads + tessellated corner arcs;
- antialiasing for free from the SDF, no MSAA dependency;
- the whole earclip/flatten code path leaves the hot path.

**Tessellation stays** — as flying-pan's `Path2D → flatten → earclip →
TriangleList` pipeline (it's pure TS and good) — but only for arbitrary
vector paths (canvas `fill/stroke`, future SVG shapes). Those feed the same
vertex buffer as regular geometry. Both paths converge on one encoder.

## Fonts

Same as flying-pan, kept: stb_truetype bakes a **glyph atlas once per
(font, size, weight)**; text emits quads referencing the atlas. Atlas grows
by re-bake on demand; eviction is LRU (flying-pan has an LRU utility
already). No per-frame native work beyond the quads themselves.

Sub-pixel positioning and hinting stay simple in v1 (grayscale AA, no LCD
subpixel rendering) — revisit with the text-shaping non-goal.

## Clipping

Scissor-rect clipping (as in flying-pan), but expressed through the batch
list: each `Batch` carries its scissor rect; native applies
`SDL_SetGPUScissor` on batch switch. Nested clips intersect during encode
(pure TS, testable) so the GPU sees a flat batch list — no stack discipline
required on the native side.

## Canvas 2D / SVG — what actually crosses the FFI

Premise: "if we use FFI most of the time, SVG/canvas rendering should also
use FFI." With this architecture that happens **automatically**, because
"rendering" *is* "writing vertices":

- `CanvasContext` (the browser-compatible 2D API) records path/fill/stroke
  ops and resolves them against the same encoder — `fill()` emits either a
  solid-quad batch or a tessellated triangle batch. Zero extra FFI; canvas
  output is just more vertices in the same buffer.
- SVG files are parsed in **TypeScript** (own parser or a small port; XML +
  path-data is plain data, and TS parsing keeps it unit-testable and
  debuggable — the same reason the layout engine stays in TS). Parsed SVG
  becomes `Path2D` + paint, which reuses everything above.
- What *does* go native, when it's worth it:
  - **Image decode** — `stb_image` behind `tsgui_image_decode(ptr, len) →
    RGBA pixels`, since decoding is pure CPU bulk work and JS decode of PNG/
    JPEG is not something we want to write or bundle.
  - **Tessellation**, later and only if profiling demands: flattening curves
    is the CPU-heavy part; it can move into `tsgui_core` behind a
    `tsgui_tessellate(paths...) → triangles` call without touching any API
    above the encoder. Until measured, it stays in TS.

So the rule is: **geometry in TS, pixels via native, vertices across the
boundary** — and nothing above the encoder can tell the difference between a
rect, a canvas path, or an SVG shape.

## Perf targets (phase 1 exit criteria)

| Scenario | Target |
|---|---|
| 10,000 solid rects, single window | 60fps, < 2ms JS encode |
| 2,000 decorated boxes (SDF) + 500 text spans | 60fps |
| FFI calls per frame | ≤ 6, constant |
| JS allocations per frame | 0 steady-state |
