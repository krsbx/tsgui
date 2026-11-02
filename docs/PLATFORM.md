# Platform Layer (Windowing, Input, Audio, GPU)

## Decision: SDL3 is the all-in-one platform

SDL3 (stable since Jan 2025, zlib license) covers, in one C library:

- **Windowing + input** — multi-window, text input / IME hooks, high-DPI,
  clipboard, file dialogs, display queries.
- **Audio** — `SDL_OpenAudioDeviceStream` with a callback/queue model that
  replaces miniaudio outright.
- **SDL_GPU** — one modern GPU API over **Vulkan (Linux), D3D12 (Windows),
  Metal (macOS)**. Command buffers, transfer buffers, render passes,
  pipelines: the same concepts as Vulkan/Metal/wgpu, so the renderer is
  written once and survives every backend change.

### Why this and not "GLFW now, migrate later"

The earlier plan (GLFW + GL for v1, SDL3 later) rested on reusing
flying-pan's GLFW bindings and GL familiarity. Both arguments dissolve in
tsgui's architecture:

- **The GL renderer was getting thrown away regardless.** We were writing
  a new batched renderer either way; SDL3's GPU-backed SDL_Renderer means
  it targets Metal/D3D12/Vulkan from day one — through FFI, with zero C
  (see the renderer architecture section below).

Result: the dependency stack collapses to **SDL3 + stb_truetype +
stb_image**, and the "GLFW + miniaudio grab-bag" problem stops existing.

### Costs accepted

- **Shader toolchain.** SDL_GPU consumes SPIR-V / DXIL / MSL. Shaders are
  authored in HLSL and cross-compiled **offline** with SDL_shadercross;
  compiled blobs are checked in. v1 needs 2–3 shaders total — a one-time
  build step, not recurring complexity.
- **No GL fallback in SDL_GPU.** Systems without Vulkan/D3D12/Metal are out
  of scope for v1 (acceptable for desktop targets; revisit for web/mobile).
- **SDL_GPU is younger than GL.** Mitigated by: ~2 years of SDL3 stability,
  the encoder being backend-agnostic (see RENDERING.md), and SDL_GPU's
  command-buffer model matching what every modern API uses anyway.

### Rejected alternatives (recorded so we don't relitigate)

- **GLFW + OpenGL v1** — simpler shader story (GLSL strings), but deprecated
  GL on macOS and a guaranteed renderer rewrite the moment Vulkan/Metal
  matters.
- **sokol** — `sokol_app.h` is **single-window by design** (games/tools that
  own one window). A GUI toolkit needs multi-window (dialogs, panels,
  palettes) — disqualifying regardless of the header-only appeal. Pairing
  sokol_gfx alone with foreign windowing is awkward and buys nothing.
- **wgpu / Dawn now** — a heavier dependency and build story than the entire
  rest of the native core combined. Revisit only if SDL_GPU hits a wall.

## Event model

Polled, never callbacks across the FFI boundary:

1. `tsgui_poll_events()` pumps SDL's event queue (main thread).
2. Native maps `SDL_Event` → packed `tsgui_event` (32 bytes:
   `type, window, i32 ×4, f32 ×4, u64 timestamp`) into a preallocated ring.
3. JS reads the ring as a typed-array view — one FFI call, zero allocation,
   zero per-event cost.

SDL's own internal callbacks (audio device thread) stay inside C and never
reach JS.

## Maintenance reality: the cost we chose

A from-scratch toolkit cannot avoid owning an OS boundary — windowing,
events, input, audio must be talked to in ~1–2k lines of C somewhere, in
every architecture. The wrapper is not that cost; it is the _containment_
of that cost:

- **Ours:** one file — event mapping switch, handle registry, init/quit,
  the render path (our logic, SDL's API).
- **SDL's:** platform quirks (Wayland/X11/Win32/Cocoa), the entire GPU
  backend layer (SDL_GPU _is_ the Metal/D3D12/Vulkan backend — zero backend
  code of ours), audio devices, DPI, input edge cases.

Binding SDL (or GLFW) directly from JS — the flying-pan model — does not
remove this code; it relocates it into TS, where the API shape and
threading rules leak into the toolkit and the FFI surface grows from ~20
functions to hundreds. The wrapper keeps the platform swappable and the TS
pure.

Accepted residual costs: SDL 3.x breaking changes land as a table
regeneration (`bun run codegen:all`) plus small TS adjustments; exotic
platform features SDL does not expose require per-platform native code we
write. The first cost exists under every binding strategy; the second under
every library choice.

## Capability exposure: two tiers, flying-pan's reachability

- **`sdl` / `image` / `ttf` / `mixer` — the hardcore tiers.** The SDL3
  family bound directly through generated FFI tables: 1000+ functions, all
  enum/macro constants, everything reachable that is FFI-expressible. App
  developers drop to these whenever tsgui has no wrapper for what they
  need. This is flying-pan's model, kept.
- **`tsgui` — the toolkit layer (pure TypeScript, later phases).** Widgets,
  layout, the renderer module: all ordinary TS built on the tiers above.
  There is **no compiled toolkit artifact at all** — the earlier plan for a
  `libtsgui.dylib` renderer core was retired when SDL_Renderer proved
  sufficient (below).

What we give up vs the earlier curated-only design: SDL's API shape is
visible to app code that chooses the hardcore tiers. What we keep: the
_toolkit's_ own layers sit in `@tsgui/gpu` and `@tsgui/widgets` as plain
TypeScript — a future platform swap is table regeneration plus one TS
module.

## Main-thread rule

SDL3's video/event subsystems must be pumped on the main thread (AppKit
requirement on macOS; same constraint GLFW had). The UI loop therefore runs
on the JS thread, same as flying-pan's proven model — JS loop, `setImmediate`
yield, ~3–6 FFI calls per frame.

## Renderer architecture (Phase 1): SDL_Renderer, zero C

The earlier plan — a `libtsgui.dylib` wrapping SDL_GPU — is retired. The
per-frame call-count math made it unnecessary once rendering became
batched: a frame is ~10 FFI calls (acquire, set state, `SDL_RenderGeometryRaw`
per texture batch, `SDL_RenderPresent`), **constant** regardless of widget
count. flying-pan's failure was calls-per-primitive (thousands); calls-per-
frame-pipeline was never the problem.

The stack, all through FFI from TypeScript:

- **`SDL_CreateRendererWithProperties` with the GPU backend** — SDL3's
  `SDL_RENDERER_GPU` batches geometry internally on Metal/D3D12/Vulkan.
- **`SDL_RenderGeometryRaw`** — one call per batch: raw client pointers to
  JS-owned vertex/index ArrayBuffers (16-byte vertices), FFI-perfect.
- **`SDL_SetGPURenderState`** (new in SDL 3.4) — custom pipelines/shaders
  attach to the 2D renderer: SDF rounded-rects/borders/shadows without
  leaving SDL_Renderer. Shaders authored offline, blobs loaded at init.
- **Audio** — SDL3_mixer (already bound) runs its own callback thread
  internally; JS only queues. No C audio code either.

If a future GPU API (wgpu/Dawn-class) ever becomes necessary, the swap is:
regenerate tables against the new library + rewrite one TS module
(`@tsgui/gpu`). The batch/encoder boundary stays fixed either way — that
boundary, not a dylib, is what contains platform risk.

Known risks: `SDL_SetGPURenderState` is new (3.4) — if it proves immature,
v1 falls back to CPU geometry for rounded rects (tessellated in TS, porting
flying-pan's Path2D/tessellation — fully sufficient for v1 shapes). The GPU
renderer backend needs Metal/D3D12/Vulkan; SDL falls back to other renderer
backends elsewhere, where custom GPU render state is unavailable.
