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

- **JS never binds the windowing library.** It only sees `tsgui_core.h`'s
  ~20 functions. flying-pan's Clang-AST GLFW bindings existed because JS
  drove GLFW directly; that artifact has no successor here. The binding
  surface is ours and tiny — hand-written, no codegen needed.
- **The GL renderer was getting thrown away regardless.** We are writing a
  new batched renderer either way; the only question is whether it targets
  deprecated-on-macOS GL (to be rewritten at Vulkan time) or SDL_GPU
  (never rewritten).

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
every architecture. The wrapper is not that cost; it is the *containment*
of that cost:

- **Ours:** one file — event mapping switch, handle registry, init/quit,
  the render path (our logic, SDL's API).
- **SDL's:** platform quirks (Wayland/X11/Win32/Cocoa), the entire GPU
  backend layer (SDL_GPU *is* the Metal/D3D12/Vulkan backend — zero backend
  code of ours), audio devices, DPI, input edge cases.

Binding SDL (or GLFW) directly from JS — the flying-pan model — does not
remove this code; it relocates it into TS, where the API shape and
threading rules leak into the toolkit and the FFI surface grows from ~20
functions to hundreds. The wrapper keeps the platform swappable and the TS
pure.

Accepted residual costs: SDL 3.x breaking changes land as a small diff in
`tsgui_core.c` plus a rebuild; exotic platform features SDL does not expose
require per-platform native code we write. Both costs exist under any
library choice.

## Capability exposure: two tiers, flying-pan's reachability

Both tiers ship in `@tsgui/bindings` (see FFI.md for the binding mechanics):

- **`sdl` — the hardcore tier.** SDL3 bound directly through generated FFI
  tables: 1000+ functions, all enum/macro constants, everything reachable
  that is FFI-expressible. App developers drop to this whenever tsgui has
  no wrapper for what they need. This is flying-pan's model, kept.
- **`tsgui` — the curated tier (Phase 1+).** A small `libtsgui.dylib`
  exposing only the things SDL cannot express through plain FFI — chiefly
  the batched SDL_GPU render call and (later) audio. Object-style
  TypeScript on top; this is what widgets are built on.

What we give up vs the earlier curated-only design: SDL's API shape is
visible to app code that chooses `sdl`. What we keep: the *toolkit's* own
layers never touch SDL — widgets/layout/render talk to `tsgui`, so a
backend swap is still one dylib away.

## Main-thread rule

SDL3's video/event subsystems must be pumped on the main thread (AppKit
requirement on macOS; same constraint GLFW had). The UI loop therefore runs
on the JS thread, same as flying-pan's proven model — JS loop, `setImmediate`
yield, ~3–6 FFI calls per frame.

## Core ABI sketch (`libtsgui`, Phase 1 — renderer + audio only)

Windowing and input are **direct SDL through the `sdl` tier** — they never
enter this dylib. `libtsgui` exists only for what plain FFI cannot express
well: the SDL_GPU batch orchestration and the audio callback thread.

```c
uint32 tsgui_abi_version(void);
int32  tsgui_init(void);                      // SDL_GPU device boot
void   tsgui_terminate(void);

// render — the one hot call. window is the SDL_Window* as a raw pointer
// (obtained from JS via SDL_CreateWindow in the sdl tier).
int32  tsgui_window_render(ptr   sdl_window,
                           ptr   vertices, uint32 vertex_count,
                           ptr   indices,  uint32 index_count,
                           ptr   batches,  uint32 batch_count);

// textures (font atlas, images) — upload is occasional, not per-frame
int32  tsgui_texture_create(uint32* out_id, ptr pixels, uint32 w, uint32 h);
void   tsgui_texture_destroy(uint32 id);

// audio (phase 6) — the device callback thread lives here, in C
int32  tsgui_audio_init(const tsgui_audio_opts* o);
int32  tsgui_audio_write(ptr frames, uint32 count);
```

Under SDL_GPU, `tsgui_window_render` maps to: upload via transfer buffer →
copy into per-window GPU vertex/index buffers → acquire command buffer →
render pass → k draw calls (one per batch/texture page) → submit + present
to the swapchain. Still one FFI call from JS.

`batches` (texture id, index range, scissor rect) lets one render call issue
a handful of draws — one per texture/atlas page — while staying a single FFI
call.

**Rule:** no SDL types in the public C ABI — raw pointers only (`ptr
sdl_window`, not `SDL_Window*`). The GPU API stays an implementation detail
behind this ABI, which is what keeps a future backend swap contained.
