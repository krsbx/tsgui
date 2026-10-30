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

## Main-thread rule

SDL3's video/event subsystems must be pumped on the main thread (AppKit
requirement on macOS; same constraint GLFW had). The UI loop therefore runs
on the JS thread, same as flying-pan's proven model — JS loop, `setImmediate`
yield, ~3–6 FFI calls per frame.

## Core ABI sketch (v1, ~20 functions)

```c
// lifecycle
uint32 tsgui_abi_version(void);
int32  tsgui_init(void);
void   tsgui_terminate(void);

// window (handles are uint32, never pointers)
int32  tsgui_window_create(uint32* out_handle, const tsgui_window_opts* o);
void   tsgui_window_destroy(uint32 h);
int32  tsgui_window_should_close(uint32 h);
void   tsgui_window_set_title(uint32 h, const char* s);

// events — polled, not callbacks. Native fills a caller-owned ring.
int32  tsgui_poll_events(void);                 // pump OS queue
int32  tsgui_events_read(ptr buf, uint32 max);  // returns count of tsgui_event

// render — the one hot call
int32  tsgui_window_render(uint32 h,
                           ptr   vertices, uint32 vertex_count,
                           ptr   indices,  uint32 index_count,
                           ptr   batches,  uint32 batch_count);

// textures (font atlas, images) — upload is occasional, not per-frame
int32  tsgui_texture_create(uint32* out_id, ptr pixels, uint32 w, uint32 h);
void   tsgui_texture_destroy(uint32 id);

// audio
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

**Rule:** no SDL types may appear in the public C ABI (no `SDL_Window*` in
signatures — windows are opaque `uint32` handles). The GPU API stays an
implementation detail behind this ABI.
