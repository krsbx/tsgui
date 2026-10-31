# Roadmap

Phases are ordered so that each one has a demoable exit and de-risks the
next. Phase 1 is the pivotal one: it proves or kills the chunky-ABI thesis
before anything else gets built on it.

## Phase 0 — SDL FFI vertical slice ✅ (2026-10-30)

- [x] Monorepo: `packages/*` + `tools/*`, ESLint import-boundary rules
      enforcing the layering.
- [x] Port flying-pan's Clang AST parser into `tools/codegen/`; add the
      FFI-table generators (bun:ffi + node:ffi) and the numeric-`#define`
      scanner (see FFI.md).
- [x] Generate SDL3 tables: 1087 functions, 95 enums, 245 defines; 144
      FFI-unsafe exclusions reported (callbacks, variadics, struct-by-value).
- [x] `@tsgui/bindings`: runtime detection, SDL3 dylib resolution
      (`TSGUI_SDL3_PATH` → platform paths → soname), `sdl` hardcore tier.
- [x] `examples/hello.ts`: window + clear + event polling, zero compiled
      code.

**Exit (met):** an SDL3 window clears to a color from pure TypeScript on
**Bun (bun:ffi)** and **Node ≥ 26.9 (node:ffi)** — `bun run examples/hello.ts
--selftest` and `node examples/hello.ts --selftest` both pass, plus a
headless smoke (`bun run smoke`).

## Phase 1 — Batched renderer in TypeScript (the thesis test, zero C) ✅ (2026-10-30)

Revised: the `libtsgui` C core is retired — SDL_Renderer's GPU backend +
`SDL_RenderGeometryRaw` + `SDL_SetGPURenderState` cover it entirely through
FFI (see PLATFORM.md).

- [x] Renderer module in `@tsgui/gpu`: GPU-backend renderer per window
      (`SDL_CreateRendererWithProperties`, "gpu" backend confirmed on
      macOS), batch accumulator into a reused vertex buffer, flush =
      `SDL_RenderGeometry` per texture batch. (Buffer since corrected to
      SDL3's 32-byte float-color `SDL_Vertex` — the SDL2-era 20-byte
      packed-u32 layout silently draws nothing.)
- [x] Texture path: procedural pixels → `SDL_CreateTextureWithProperties`
      + `SDL_UpdateTexture`, drawn through the textured batch. (Also fixed
      en route: the codegen dropped every enum-by-value param function —
      77 recovered — and node:ffi returns raw addresses for `'string'`
      returns, now converted in the node loaders.)
- [x] **Phase 2 core (2026-10-31)** — `examples/showcase.ts` verified on
      Bun + Node: scissor clip push/pop (`SDL_SetRenderClipRect`), rounded
      rects via CPU tessellation (fan from center, 12-seg corners), real
      PNG through the `image` tier (runtime-generated via surface +
      `SDL_SavePNG` → `IMG_LoadTexture`), and text via the `ttf` tier
      (`TTF_RenderText_Blended` with the SDL_Color-as-u32 ABI packing and
      the SDL3 `length` param, per-run texture cache, white glyphs + tint).
      Codegen hardened further: enum-tag stripping, returned-as-pointer
      handle rule (`SDL_Texture`/`SDL_Surface`/`SDL_Rect` all typed
      correctly), and the DATA_STRUCTS allowlist.
- [ ] SDF shaders via `SDL_SetGPURenderState` — deferred to a Phase 2.5
      spike. Everything needed is bound and confirmed: `SDL_CreateGPURenderState`,
      the fragment-shader create-info, and the device via
      `SDL_PROP_RENDERER_GPU_DEVICE_POINTER` ("SDL.renderer.gpu.device").
      Requires the SDL_shadercross offline toolchain; CPU tessellation
      ships meanwhile.

**Exit (met):** 10k rects at 60fps with ≤ 10 FFI calls/frame, on Node and
Bun — measured **avg 0.35ms/frame (≈2,850 fps), p99 < 1ms, 6 calls/frame,
`renderer: gpu` on both runtimes** (Apple M-series; ~33× the 60fps budget).

## Phase 2 — Renderer core ✅ (2026-10-31)

Revised mid-phase: the zero-C decision routes decoration through the SDL
tiers instead of porting stb_truetype / stb_image C sources, and the
install-time source build disappeared along with libtsgui — nothing
compiles at all.

- [x] Scissor clipping — `SDL_SetRenderClipRect` push/pop around batch
      flushes (`GpuRenderer.pushClip`/`popClip`). (2026-10-31)
- [x] Text via the SDL3_ttf tier — per-run texture cache, white glyphs +
      tint; supersedes the stb_truetype atlas port. (2026-10-31)
- [x] Image textures via the SDL3_image tier — `IMG_LoadTexture`, runtime
      PNG through surface + `SDL_SavePNG`; supersedes
      `tsgui_image_decode`. (2026-10-31)
- [x] Decoration layers in `@tsgui/widgets`' paint walk — shadow (stacked
      rounded-rect falloff), border (oversized shape), background
      (rounded when radius is set). (2026-10-31)
- [x] ~~Install-time source build~~ — dropped with the zero-C decision:
      zero compiled artifacts is the feature.
- [ ] → SDF rounded-rect/border/shadow shader + `flags` dispatch is the
      **Phase 2.5 spike** (see phase 1 notes); CPU tessellation ships.

**Exit (met):** the "kitchen sink" window — `examples/showcase.ts`
(decorated boxes, clips, images, text) and `examples/gallery.ts` (the
widget-layer kitchen sink) render on Node and Bun; `bun test` includes
pixel-readback guards for the geometry/vertex ABI and batch isolation.

## Phase 2.5 — SDF decoration spike (parked)

- [ ] `SDL_SetGPURenderState` + a fragment shader for rounded-rect /
      border / shadow; `flags` dispatch in the paint walk replaces the
      stacked-layer approximation.
- Everything needed is bound and confirmed: `SDL_CreateGPURenderState`,
      the fragment-shader create-info, and the device via
      `SDL_PROP_RENDERER_GPU_DEVICE_POINTER` ("SDL.renderer.gpu.device").
      Requires the SDL_shadercross offline toolchain.

**Exit:** hairline-smooth decoration at any radius, no CPU tessellation
in the paint path.

## Phase 3 — Layout + reconciler ✅ (2026-10-31)

- [x] Port flying-pan's flexbox engine into `@tsgui/layout` (2026-10-31)
      — GL coupling stripped, `LayoutContext` minimal + injected (was
      aliased to the renderer's PaintContext), single-object params kept,
      per-run text measurement via the `ttf` tier. 8 headless tests green
      on the full semantic surface; see docs/LAYOUT.md.
- [x] Port reconciler + `stableId` + `StateStore` into `@tsgui/widgets`
      (2026-10-31) — keyed children, identity short-circuit, mount/update/
      unmount hooks, state destroy-on-unmount.
- [x] **Headless harness** (2026-10-31) — `renderHeadless()` runs tree →
      reconcile → layout → recorded paint ops with a null GPU (injected
      text measurement + interaction states); golden snapshots over layout
      trees and op buffers via `toMatchSnapshot`.

**Exit (met):** widget tree → layout → paint ops entirely in `bun test`,
no window; CI runs the suite plus showcase/gallery selftests on both
runtimes.

## Phase 4 — Interactions + animation

- [ ] Event ring decode on the JS side (pointer/focus/scroll dispatch, ported
      logic, new data source).
- [ ] AnimationManager port (transitions, easing).
- [ ] Controlled/uncontrolled state, pseudo-states (`:hover` etc.).

**Exit:** the flying-pan example apps rebuilt on tsgui, interactive at 60fps.

## Phase 5 — Devtools (the debuggability payoff)

- [ ] `@tsgui/devtools`: Bun.serve inspector — live widget tree over
      WebSocket, resolved styles, hover-highlight in-app, frame-time graph,
      vertex/draw-call counters.
- [ ] Canvas 2D `CanvasContext` port onto the encoder.
- [ ] Path2D/tessellation port for arbitrary vector paths; TS SVG parser
      feeding it.

**Exit:** the "hard to debug" complaint has a named tool: open a browser tab,
click a widget, see why.

## Phase 6 — Audio + packaging

- [ ] SDL3 audio stream behind `tsgui_audio_*`.
- [ ] Distribution: app-bundling story (app authors ship the compiled binary
      — their users compile nothing); optional prebuilt platform packages as
      opt-in convenience; codesigning + icons for macOS/Windows.

## Deliberately deferred (with reasons)

| Item | Why deferred |
|---|---|
| Accessibility tree | Large, orthogonal; design ABI hooks now (`stableId` is already the key), build later. |
| IME / HarfBuzz shaping | HarfBuzz is a dependency and a half; UTF-8 simple text covers v1 apps. |
| Vulkan/Metal/D3D12 backends | Come free via SDL_GPU from phase 1 — nothing deferred. |
| wgpu / Dawn | Only if SDL_GPU ever hits a wall (see PLATFORM.md). |
| Multi-window | flying-pan has it; port in phase 4 — cheap once the ABI takes a window handle. |
| GPU-instanced text | Only if the atlas-quads model misses 60fps targets. |
