# FFI Strategy

## Requirement

One binding approach that works on **both Node and Bun** (Deno would be free
if it falls out), calling our own small native platform layer, with:

- bulk buffer passing (megabytes of vertex data per frame),
- struct-by-value where unavoidable,
- callbacks only if we choose the callback event model (we don't — see
  PLATFORM.md),
- zero per-frame per-call overhead.

## Candidates evaluated

| Approach | Node | Bun | Verdict |
|---|---|---|---|
| `bun:ffi` | ❌ | ✅ | Fast, zero build step, but Bun-only. Great as a dev backend, not the product path. |
| **koffi** | ✅ | ⚠️ | Node-first N-API FFI. Not officially supported on Bun; a May 2025 report ([koffi#234](https://github.com/Koromix/koffi/issues/234)) shows basic examples installing fine but **crashing on real native calls** under Bun. Does not satisfy the cross-runtime requirement. Re-evaluate only if koffi ships official Bun support. |
| `node-ffi-napi` | ❌ dead | ❌ | Unmaintained. Not an option. |
| **N-API addon** (hand-written C against `node_api.h`) | ✅ | ✅ | Both runtimes load `.node` addons natively. This is the genuine cross-runtime path — the same conclusion [opentui reached](https://github.com/anomalyco/opentui) moving off `bun:ffi`. |
| **napi-rs** (Rust) | ✅ | ✅ | Same runtime story, excellent build/prebuild tooling, but adds a Rust toolchain for a ~600-line wrapper. |
| node-addon-api (C++) | ✅ | ✅ | C++ comfort layer over N-API; fine, but our wrapper is small enough that plain C keeps the toolchain uniform. |

Precedent: this exact decision (bun:ffi vs koffi vs NAPI for Bun+Node) was
worked through publicly by the opentui project in mid-2025; they landed on
NAPI addons.

## Recommendation

**One C core, two thin frontends, chosen at import time:**

```
native/
  tsgui_core.c/.h      Pure C ABI (no Node/Bun knowledge): window, events,
                       batch draw, textures, audio. Links SDL3
                       (windowing/input/audio/SDL_GPU) + stb_truetype/stb_image.
  tsgui_napi.c         ~600 lines of node_api.h glue exposing the same ABI
                       as functions taking ArrayBuffer-backed pointers.
                       Build output: tsgui.node (prebuilt per platform/arch).

packages/bindings/
  src/index.ts         Detects runtime, loads the right frontend:
                         typeof Bun !== "undefined" → try tsgui.node (N-API),
                                                     fallback bun:ffi
                         Node                      → tsgui.node
  src/bun-ffi.ts       bun:ffi frontend (dlopen libtsgui.dylib/.so/.dll).
  src/napi.ts          tsgui.node frontend.
  src/types.ts         The PlatformBridge interface both frontends implement.
```

Why this shape:

1. **The C core stays dependency-free** — no `node_api.h` inside the core. It
   stays loadable by `dlopen` (bun:ffi), wrappable by N-API, and reusable by
   anything else later (Python, Zig, whatever).
2. **The N-API frontend is the product path** — it is the only mechanism both
   runtimes officially support, and it lets us return proper JS errors,
   validate arguments, and hand back `Buffer`/`ArrayBuffer` views over native
   memory without copy gymnastics.
3. **The bun:ffi frontend is the dev iteration path** — while the ABI is
   churning (phase 1), edit `tsgui_core.c`, recompile, reload, no `.node`
   rebuild in the loop. It also serves as a canary: if the ABI needs exotic
   types that bun:ffi can't express, the ABI is wrong.

### What we do NOT use koffi for

Nothing, for now. It would be a third binding implementation we don't control,
it is Node-only in practice today, and its N-API-under-Bun reliability is
unproven ([koffi#234](https://github.com/Koromix/koffi/issues/234)). Keep it on
the radar: if koffi adds official Bun support it becomes a legitimate
zero-C-wrapper alternative to `tsgui_napi.c` for Node-only consumers.

## ABI rules (applies to both frontends)

- **Chunky, not chatty.** Target ≤ 30 functions total; ≤ 6 calls per frame.
- **No allocations across the boundary.** JS owns the frame buffers (passes
  `ptr, len`); native owns GPU resources and returns opaque handles (`uint32`).
- **No callbacks in v1.** Input events are polled: native fills a preallocated
  event ring during `poll_events`, JS reads it. Callbacks via FFI are the
  least portable, hardest-to-debug mechanism in every runtime.
- **Plain C ABI** on the core: `int32/uint32/uint64/double/ptr` scalars only.
  No struct-by-value parameters (pass pointers into caller-owned scratch if a
  struct is needed) — struct-by-value is where every FFI library's bugs live.
- **Errors are return codes** (`0 = ok`, negative = typed error), converted to
  thrown JS errors in `bindings`. Fail loud, per flying-pan convention.
- Version the ABI: `tsgui_abi_version()` checked at load, so a stale
  `.node`/dylib fails with a clear message instead of corrupting memory.

## First build target

A function-per-platform matrix via the napi-rs CLI's build recipe or
`prebuildify`: macOS (arm64, x64), Windows (x64), Linux (x64, glibc + musl).
CI releases binaries as GitHub release assets; `bindings` resolves and
downloads them on install, with a source-build fallback (`cc`).
