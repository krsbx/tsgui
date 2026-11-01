# Architecture

## Monorepo layout

Bun workspaces (`packages/*`), one package per layer:

```
packages/
  bindings/     @tsgui/bindings   Native entry points (see FFI.md). The ONLY
                                  package allowed to dlopen native code.
  gpu/          @tsgui/gpu        Batched renderer: geometry → SDL_Vertex
                                  buffers → SDL_RenderGeometry (see RENDERING.md).
  layout/       @tsgui/layout     Flexbox engine. Pure TS.
  widgets/      @tsgui/widgets    Widget set, reconciler, dispatchers,
                                  headless harness. Pure TS at runtime.
examples/                         Sample apps (hello, showcase, gallery).
tools/codegen/                    Clang AST → FFI tables (bun:ffi / node:ffi)
                                  + constants, from real C headers
                                  (parser ported from flying-pan).
docs/                             These documents.
```

Planned packages (see ROADMAP.md): `@tsgui/platform` (window/input/audio
lifecycle), `@tsgui/devtools` (inspector server, phase 5).

## The layering rule

**`layout` is pure TypeScript** — no FFI, no native code, no window.
**`widgets` never imports `@tsgui/bindings`** — its SDL-adjacent needs go
through `@tsgui/gpu` or injectable seams (clipboard). `bindings` is the only
package that dlopens native code.

Concretely:

| Package | May import | Never imports |
|---|---|---|
| `bindings` | `bun:ffi` / `node:ffi` dlopen tables + runtime split (escape hatch: `sdlRaw`) | anything else in the repo |
| `gpu` | `bindings` (SDL calls) | `layout`, `widgets` |
| `layout` | nothing (pure TS) | everything |
| `widgets` | `layout`, `@tsgui/gpu` types, injectable seams (clipboard) | `bindings` |
| `platform` (planned) | `bindings` | `gpu`, `layout`, `widgets` |
| `devtools` (planned) | any package (it's tooling) | — but is optional at runtime |

This is enforced by an ESLint `no-restricted-imports` rule per package, not by
convention. The payoff: `bun test packages/layout` runs the entire flexbox
engine with no window, no GPU, no native code — this is the property
flying-pan lacks and it is the foundation of headless snapshot testing.

## Frame loop

JS-driven; SDL3 requires the main thread for video/events. The gallery
(`examples/gallery.ts`) is the reference implementation:

```
while (running):
  while (SDL_PollEvent):               # decode SDL events → typed events
    pointerEvents / keyboardEvents     # (down/up/move, keys, chars)
  if (dirty): tree = rebuild()         # declarative rebuild on state change
  reconciled = reconciler.diff(tree)   # stableIds, identity short-circuit
  root = layoutFlex(reconciled)        # pure TS → LayoutNode tree
  pointer.dispatch(events)             # hover/press/click + drag capture
  focus.dispatch(events)               # focus, key/char routing
  paintTree(ctx, root)                 # queues batches into the renderer
  gpu.present()
```

Per frame the FFI count is constant **per texture batch** (see
RENDERING.md) — it does not scale with widget count.

### Dispatchers

Pointer (hover/press/click/drag), focus (click-to-focus, tab cycling,
key/char routing) and scroll (wheel → nearest scrollable ancestor,
clamped bounds, velocity coasting) are event-fed dispatchers in
`widgets/src/interactions/`: the app decodes SDL events into typed events
and feeds them per frame. Pure TypeScript — headless-testable, never touch
SDL themselves.

### GC discipline

Vertex/index buffers are **preallocated and reused** (grown by doubling);
text runs are cached per unique string as GPU textures. Steady-state
per-frame allocation is the batch views at flush only.

## Threading model

- The UI loop runs on the main thread (JS thread) — required by macOS and
  simplest everywhere else.
- Heavy non-UI work (file IO, network) stays in normal JS async land.
- SDL owns its internal threads (audio callback, etc.) and never calls back
  into JS from them; everything above the bindings is single-threaded JS.

## Design decisions carried over from flying-pan

- **Declarative rebuild model** — user rebuilds the widget tree each frame;
  reconciler diffs and preserves state by `stableId`.
- **Single-object params** everywhere, except adapters that intentionally
  mirror web APIs (`CanvasContext`).
- **Fail loud** in render/FFI/stateful paths; no defensive recovery.
- **docs-as-code** — every subsystem gets a doc in `docs/` that is the
  authoritative reference, updated with the code.
