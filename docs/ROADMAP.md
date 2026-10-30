# Roadmap

Phases are ordered so that each one has a demoable exit and de-risks the
next. Phase 1 is the pivotal one: it proves or kills the chunky-ABI thesis
before anything else gets built on it.

## Phase 0 — Skeleton (days)

- [ ] Monorepo: `packages/*` per ARCHITECTURE.md, ESLint import-boundary rule
      enforcing the layering.
- [ ] Port flying-pan's Clang AST parser + codegen into `tools/codegen/`;
      add the napi-glue, ts-bindings, and struct-writer generators (see
      FFI.md).
- [ ] `native/` skeleton: `tsgui_core.c/.h` on SDL3 with `abi_version`,
      `init`, `window_create`, `window_render` (clear-color only at first);
      vendored SDL3 + stb; cmake-js build wired to postinstall.
- [ ] Generate the N-API glue + object-style TS bindings from the header;
      CI builds the addon on macOS.

**Exit:** an SDL3 window clears to a color from JS, via the generated
N-API bindings, on Node and Bun.

## Phase 1 — Chunky ABI vertical slice (the thesis test)

- [ ] Shader build step: HLSL sources + SDL_shadercross offline script,
      compiled blobs checked in (one pipeline to start).
- [ ] `tsgui_window_render(h, verts, n, idxs, m, batches, k)` as specced in
      PLATFORM.md; SDL_GPU implementation (transfer buffers, one render
      pass, k draw calls).
- [ ] Encoder prototype in `@tsgui/gpu`: fill 10k solid rects into a reused
      ArrayBuffer from JS.
- [ ] Verify the same addon runs on **Node and Bun** — this is the moment
      the cross-runtime requirement is actually proven, before binding-choice
      doubts can return.
- [ ] Benchmark: FFI calls/frame, JS encode ms, total frame ms — on macOS,
      Windows, and Linux.

**Exit:** 10k rects at 60fps with ≤ 6 FFI calls/frame on Node and Bun.

## Phase 2 — Renderer core

- [ ] SDF rounded-rect/border/shadow shader + `flags` dispatch.
- [ ] Font atlas (port stb_truetype baking from flying-pan), text quads.
- [ ] Image textures via `tsgui_image_decode` + upload.
- [ ] Scissor-in-batch clipping.
- [ ] Install-time source build verified end-to-end (cmake-js + vendored
      deps + user-level cache) on macOS, Linux, and Windows.

**Exit:** a static "kitchen sink" window — decorated boxes, text, images —
drawn with one render call, on Node and Bun.

## Phase 3 — Layout + reconciler

- [ ] Port flying-pan's flexbox engine into `@tsgui/layout`, GL/coupling
      stripped, single-object params kept.
- [ ] Port reconciler + `stableId` + `StateStore` into `@tsgui/widgets`.
- [ ] **Headless harness**: layout + encode with a null GPU backend;
      golden-snapshot tests over layout trees and encoded buffers.

**Exit:** widget tree → layout → encoded frame entirely in `bun test`, no
window; snapshot CI green.

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
