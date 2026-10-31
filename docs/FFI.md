# FFI Strategy

## Decision: runtime-split dlopen, generated tables, no addon

**Status: implemented (Phase 0).** There is no compiled JS-side artifact at
all — no N-API addon, no `node_api.h`, no cmake for bindings. Both runtimes
`dlopen` SDL3 directly through their first-party FFI:

```
        SDL3 + SDL3_image/ttf/mixer (system dylibs)
              ↘                            ↙
        bun:ffi table               node:ffi table        ← generated from real headers
              ↘                            ↙
       packages/bindings — runtime detection at import
```

```ts
import { sdl, EventType, Define } from "@tsgui/bindings"; // backend-agnostic
sdl.SDL_CreateWindow("hi", 1280, 800, Define.SDL_WINDOW_RESIZABLE);
```

- **Bun → `bun:ffi`**, **Node ≥ 26.9 → `node:ffi`** — both first-party,
  both experimental; that trade-off is accepted deliberately. Churn lands
  in one regenerated table file per runtime.
- **koffi** (Node fallback): third-party, mature; adopt only if `node:ffi`
  breaks something we need.
- **N-API addon**: recorded as a future option if distribution ever demands
  runtime-version-independent binaries. The codegen's model is
  generator-agnostic — an addon generator can be added without redesign.
  Until then it is dead weight we deliberately don't carry.

## Codegen: real headers in, tables out

`bun run codegen:all` (tools/codegen) dumps the SDL3 family headers through clang's AST
JSON (`clang -Xclang -ast-dump=json`) and generates:

| Output | Consumed by |
|---|---|
| `constants.ts` — enums + numeric `#define`s, per library | both backends |
| `defs-bun.ts` / `defs-node.ts` — declarative dlopen tables | the loaders |
| `types.ts` — `<Lib>Symbols`: typed positional surface | loaders, hot paths |
| `functions.ts` — `<Lib>Functions`: **single-object-param wrappers** with real param names from the headers (`SDL_CreateWindow({ title, w, h, flags })`), plus the `create<Lib>Functions()` factory | the primary export (`sdl`, `image`, …) |

Two surfaces per library, both convention-compliant:
- **`sdl`** (object-param) — the primary export; flying-pan's binding-level
  convention. String params are `string \| null` (C `char*` reality —
  `SDL_CreateRenderer({ window, name: null })` is the default-backend call).
- **`sdlRaw`** (positional, typed via `<Lib>Symbols`) — the documented
  escape hatch for hot paths and toolkit internals; `@tsgui/gpu` uses it
  so the render path carries zero wrapper overhead. Both surfaces behave
  identically on Bun and Node (node loaders convert `'string'` returns).

**Result: 1378 functions across 4 libraries** — sdl 1087, image 102, ttf 100, mixer 89 — plus 101 enums and 267 numeric defines.

Macros never appear in the AST, so `SDL_INIT_VIDEO`-style constants come
from a textual `#define` scanner (flying-pan solved this with a
hand-maintained `.macros` file; ours scans the headers directly).

**The pipeline is library-agnostic.** `clang/`, `model`, and `gen` know
nothing about SDL — binding another C library means adding one `Target`
(header path, symbol prefix, output dir) to `tools/codegen/src/index.ts`
and one folder: `@tsgui/bindings/src/libraries/<name>/` holds that
library's loaders (`bun.ts`, `node.ts`), dylib resolution (`path.ts`), and
generated tables (`generated/`), exposed through a single re-export line in
the package root. SDL is just the first target.

Two AST subtleties the parser handles (flying-pan's parser got these wrong
too, silently):

1. **Enum constants without explicit initializers** (`SDL_EVENT_TERMINATING`
   & friends) have *no value node* — the compiler assigns previous + 1. The
   parser keeps a running counter instead of defaulting to 0.
2. **clang drops `desugaredQualType` on function types**, so SDL typedef
   names (`Uint16`, `Sint32`) survive in return types. Non-prefixed typedefs
   (`Sint32` does not start with `SDL_`!) are resolved through the header's
   own typedef declarations before classification.

### FFI-safety filter

Everything expressible in both FFI dialects is exposed — scalar/pointer
signatures, `const char*` as strings, opaque pointers as handles. Excluded
(and **reported**, never silently dropped):

- variadic functions (`SDL_sprintf`, …)
- function-pointer parameters (callbacks — `SDL_qsort`, …)
- struct/union **by value** params or returns
- enum constants referencing unknown symbols

Current exclusions: 144 of 2231. The report prints at every codegen run;
widening exposure later usually means adding a struct-writer or a tiny
shim, not redesigning.

## ABI rules

- **Chunky at the core.** Direct SDL calls are fine for windowing/events —
  they're low-frequency. Per-frame GPU work goes through the Phase 1
  batching: JS fills one preallocated buffer per batch, one
  `SDL_RenderGeometryRaw` call draws it.
  Target ≤ 6 hot-path calls per frame.
- **No allocations across the boundary.** Frame buffers are JS-owned
  ArrayBuffers, borrowed for the call; GPU resources are opaque handles
  that flow function → function and never cross backends.
- **No callbacks.** SDL3 is polled (`SDL_PollEvent` takes a pointer — JS
  decodes the event struct with a DataView). Audio later: the callback
  thread lives inside SDL3_mixer, never reaches JS.
- **Errors fail loud.** `SDL_GetError()` is surfaced in thrown JS errors.

## Build & distribution

- **Nothing to build for bindings** — SDL3 comes from the system (brew on
  macOS, distro packages on Linux, official binaries on Windows).
  Resolution: `TSGUI_SDL3_PATH` env → platform-conventional paths → bare
  soname (system loader search).
- **There is nothing to compile.** Not bindings (dlopen), not the renderer
  (SDL_Renderer through FFI). The toolkit is pure TypeScript end to end.
- App distribution (phase 6): apps bundle the SDL dylibs; their users
  compile nothing.

## The extension way (binding-level FFI-unsafe functions)

Functions excluded from the generated tables (by-value structs like
`SDL_Color`, variadics, callbacks) get back through a **hand-written
extension file** per library: `libraries/<name>/extension.ts`. One place
declares both halves:

- `ttfExtensionDefs` — raw dlopen defs in the backend-neutral string
  dialect (`arguments`/`return` as type names); the bun loader translates
  names → FFIType, node consumes them natively.
- `ttfExtension(symbols)` — object-param wrappers over the extended
  symbol surface, merged into the primary export by both loaders:
  `export const ttf = { ...createTtfFunctions(raw), ...ttfExtension(raw) }`.

The loaders type their raw export as `<Lib>ExtensionSymbols` (the
generated `<Lib>Symbols` plus the extension signatures), so extension
wrappers and toolkit code both see real branded handles. Documented ABI
shortcuts (e.g. SDL_Color-as-u32) live exactly here — visible, reviewed,
one file per library.

## Historical notes (so we don't relitigate)

1. **koffi everywhere** — unofficial, crash-prone on Bun
   ([koffi#234](https://github.com/Koromix/koffi/issues/234)).
2. **N-API addon with hand-written glue** — stable but drags per-platform
   packaging and bridge maintenance in from day one.
3. **N-API with generated glue + source-build** — solved the maintenance,
   kept the build pipeline; superseded when full SDL exposure and zero
   build were valued over runtime-version stability.
4. **This** — dlopen split, tables generated from real headers.
   Development friction is the lowest of all four, exposure is total,
   and the upgrade path to (3) stays open through the shared model.
