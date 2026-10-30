# FFI Strategy

## Requirement

One native binding approach that is **stable across Node and Bun majors**,
calling our own small native platform layer, with:

- bulk buffer passing (megabytes of vertex data per frame),
- pointers to caller-owned memory where a struct is needed,
- no callbacks in the binding layer (events are polled — see PLATFORM.md),
- zero per-frame per-call overhead,
- **no per-platform binary publishing pipeline**,
- **TypeScript API in single-object parameters** (flying-pan convention),
  never positional arguments.

## Decision: generated N-API addon, built from source at install

```
                 tsgui_core.h  ← the spec; hand-written once
                        │
              tools/codegen (Clang AST → generators)
        ┌───────────────┼──────────────────────────┐
        ▼               ▼                          ▼
  tsgui_napi.c    bindings/napi.ts          struct writers
  (N-API glue)    (object-style API)        (CStruct layout)
        │               │                          │
        └─────── cmake-js build at install ───────┘
                        │
              tsgui.node  ← works on Node AND Bun
```

- **N-API for stability.** Node-API's contract is *ABI* stability: the addon
  is compiled once and keeps working across Node and Bun major versions.
  That is precisely the guarantee the dlopen FFI APIs (`node:ffi` Stability 1
  experimental, `bun:ffi` runtime-specific) do not give. Bun loads N-API
  addons natively; our surface (plain calls, ArrayBuffers, error throwing)
  is the well-trodden subset.
- **Codegen for the bridge.** The C glue, the TypeScript bindings, and the
  struct writers are all generated from `tsgui_core.h`. Hand-maintained
  bridge code: zero. The header is the spec; the codegen (ported from
  flying-pan's Clang AST pipeline) is the compiler.
- **Source build for distribution.** No platform binaries are published.
  SDL3 (CMake) and stb headers are vendored in-repo; `cmake-js` compiles
  SDL3 + `tsgui_core.c` + glue at install. A user-level cache
  (keyed by package version + arch) makes it once per machine, not per
  project.

### TypeScript API shape

Every function maps to a single options object; out-params become return
values. App code never sees the C ABI:

```ts
// generated — object-style, out-param promoted to return value
const win = bridge.createWindow({ title: "App", width: 1280, height: 800 });
bridge.render({ window: win, vertices, indices, batches });
```

Inside the generated backend, the object is destructured and marshalled
positionally to the C call. Object allocation cost is irrelevant at the
target of ≤ 6 calls per frame.

### Build-on-user-machine: who compiles what

- **Framework consumers (developers)** run the install-time build. That is
  the entire exposed audience: Xcode CLT on macOS, MSVC Build Tools on
  Windows, gcc/clang + dev headers on Linux.
- **Users of apps built with tsgui never compile anything.** The app author
  bundles the compiled binary with their app; for them it is just a file in
  the package.
- **Prebuilt platform packages** may be added later as an *optional*
  convenience for compile-less environments (managed CI, locked-down hosts).
  They are an optimization, not a requirement — the inversion of the usual
  N-API distribution story, where prebuilts are mandatory and source build
  is the fallback.

### Why the earlier "dlopen split" plan was superseded

`bun:ffi`/`node:ffi` avoided packaging machinery but bought runtime-API
churn: `node:ffi` is experimental (Stability 1) and both APIs reshape across
majors. With codegen making every backend nearly free, that trade is no
longer worth it: the generated tables (`bun-ffi.ts`, `node-ffi.ts`) are
kept as **escape hatches** — regenerate them if the N-API path ever
misbehaves on a specific runtime.

## Codegen

Port flying-pan's Clang AST parser + codegen (`src/ffi/ast`, `src/ffi/parser`,
`src/ffi/codegen`) into `tools/codegen/`. It is small here because the ABI
vocabulary is deliberately tiny:

- scalars: `int32 / uint32 / uint64 / double`, plus `ptr` and `string`
- one direction of out-params (`uint32* out_handle`) → promoted to return values
- structs by pointer, with generated writers (flying-pan's `CStruct` /
  `BaseStruct` utilities handle alignment/layout already)

Generators (all from the same parsed header):

| Generator | Output |
|---|---|
| napi-glue | `tsgui_napi.c`: registration table, arg extraction, out-param returns, negative return codes → thrown `Error` with `tsgui_error_string(code)` |
| ts-bindings | `bindings/napi.ts`: typed object-style API over the glue |
| struct-writers | TS classes writing/reading ABI structs into `ArrayBuffer`s at generated offsets |
| ffi-tables *(optional)* | `bun-ffi.ts` / `node-ffi.ts` dlopen tables for the escape hatches |

Regeneration is part of the build (`bun run codegen`); the header changes →
all surfaces regenerate together. Generated files carry a header marking them
do-not-edit.

## Language split

| File | Written by | Why |
|---|---|---|
| `tsgui_core.c/.h` | hand-written C (~1–2k lines) | SDL plumbing, event mapping, one batched draw. The header is the spec. |
| `tsgui_napi.c` | **generated** | Mechanical N-API glue. |
| `bindings/*.ts` | **generated** | Object-style TS API + struct writers. |
| `tools/codegen/*` | hand-written TS | Port of flying-pan's parser/codegen. |
| `bun-ffi.ts`, `node-ffi.ts` *(escape hatches)* | **generated** | dlopen tables, regenerated on demand. |

Everything above the boundary — layout, widgets, reconciler, encoder,
devtools — stays TypeScript. The C surface is small, dumb, and specified by
one header; the bridge maintains itself.

## ABI rules (enforced by the header + codegen)

- **Chunky, not chatty.** Target ≤ 30 functions total; ≤ 6 calls per frame.
- **No allocations across the boundary.** JS owns the frame buffers (passes
  `ptr, len`); native owns GPU resources and returns opaque handles (`uint32`).
- **No callbacks in v1.** Input events are polled: native fills a preallocated
  event ring during `poll_events`, JS reads it.
- **Plain C ABI**: `int32/uint32/uint64/double/ptr/string` only; structs by
  pointer, never by value. Struct-by-value is where every FFI bridge's bugs
  live.
- **Errors are return codes** (`0 = ok`, negative = typed error); the glue
  converts them to thrown JS errors. Fail loud, per flying-pan convention.
- Version the ABI: `tsgui_abi_version()` checked at load; a stale addon
  fails with a clear message instead of corrupting memory.

## Build & distribution

- **Dev:** `cmake-js build` (or `bun run build:native`) compiles the addon
  locally; `TSGUI_NATIVE_PATH` overrides the search path for experiments.
- **Install:** `cmake-js` in a postinstall hook; vendored SDL3 + stb mean no
  system packages. User-level cache keyed by (version, platform, arch).
- **Ship (apps):** app authors bundle the built binary with their app —
  their users compile nothing.
- **Ship (optional):** prebuilt platform packages as opt-in convenience;
  source build remains the default and the fallback.
- **Source fallback is the primary path** — keep it green in CI on all
  three platforms; it is also what makes CI a test matrix instead of a
  release pipeline.

## Historical notes (kept so we don't relitigate)

- **koffi** — mature third-party FFI, Node-first; crash-prone on Bun
  ([koffi#234](https://github.com/Koromix/koffi/issues/234)). Superseded by
  `node:ffi`, then by this plan.
- **Runtime-split dlopen** (`bun:ffi` on Bun, `node:ffi` on Node) — sound
  while both APIs were stable enough; abandoned when stability across
  majors became the requirement and codegen made backend switching free.
- **N-API with hand-written glue + npm platform packages** — the original
  objection (maintaining bridge C by hand, publishing per-platform
  binaries) is answered by codegen and source build, not by abandoning
  N-API.
