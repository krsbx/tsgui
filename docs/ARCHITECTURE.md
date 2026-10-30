# Architecture

## Monorepo layout

Bun workspaces (`packages/*`), one package per layer:

```
packages/
  bindings/     @tsgui/bindings   Native entry points (see FFI.md). The ONLY
                                  package allowed to load native code.
  platform/     @tsgui/platform   Window/input/audio lifecycle over bindings.
  gpu/          @tsgui/gpu        Frame encoder: widget-agnostic geometry →
                                  typed-array vertex/index buffers.
  layout/       @tsgui/layout     Flexbox engine. Pure TS.
  widgets/      @tsgui/widgets    Widget set, reconciler, state, animation.
  devtools/     @tsgui/devtools   Inspector server + headless test harness.
examples/                         Sample apps.
native/                           C core (tsgui_core.c/.h) + vendored SDL3/stb.
tools/codegen/                    Clang AST → N-API glue + TS bindings
                                  (ported from flying-pan).
docs/                             These documents.
```

## The layering rule

**`layout`, `gpu`, `widgets`, and `devtools` must never import `@tsgui/bindings`
(or anything that does, transitively, except through `platform`).**

Concretely:

| Package | May import | Never imports |
|---|---|---|
| `bindings` | generated N-API addon (dlopen tables: escape hatches) | anything else in the repo |
| `platform` | `bindings` | `gpu`, `layout`, `widgets` |
| `gpu` | nothing (pure TS) | everything |
| `layout` | nothing (pure TS) | everything |
| `widgets` | `layout`, `gpu`, (types of) `platform` | `bindings` |
| `devtools` | any package (it's tooling) | — but is optional at runtime |

This is enforced by an ESLint `no-restricted-imports` rule per package, not by
convention. The payoff: `bun test packages/layout` runs the entire flexbox
engine with no window, no GPU, no native code — this is the property
flying-pan lacks and it is the foundation of headless snapshot testing.

## Frame loop

JS-driven (same shape as flying-pan's, proven on macOS; SDL3 likewise requires
the main thread for video/events):

```
while (!window.shouldClose):
  events  = platform.pollEvents()        # one FFI call → packed event batch
  tree    = userRebuild()                # declarative rebuild (or manual API)
  reconciler.diff(prev, tree)            # stableIds, state preservation
  layout = flexbox.measure(tree)         # pure TS → LayoutNode tree
  frame  = encoder.encode(layout, state) # pure TS → vertex/index ArrayBuffers
  platform.render(frame)                 # ONE FFI call: upload + draw + swap
  animation.tick()
  await yield()                          # setImmediate — unblock JS event loop
```

Per frame: ~3–6 FFI calls total (poll, render, occasional texture uploads),
regardless of how many widgets are on screen. In flying-pan the count scales
with widget count; here it is constant.

### GC discipline

The frame buffers are **preallocated and reused** (one `ArrayBuffer` per
window, ring-allocated text quads). The hot path does zero allocation. GC
pauses at 60fps are invisible in dev and painful in production — this removes
the main source.

## Threading model

- The UI loop runs on the main thread (JS thread) — required by macOS AppKit
  and simplest everywhere else.
- Heavy non-UI work (file IO, network) stays in normal JS async land; worker
  threads may call into the native layer for non-window things (audio mixing,
  image decode) because those don't touch AppKit/GLFW.
- The native layer is single-threaded by contract, except audio which owns its
  own callback thread inside C (SDL3 audio stream model) and never calls back
  into JS from it.

## Design decisions carried over from flying-pan

- **Declarative rebuild model** — user rebuilds the widget tree each frame;
  reconciler diffs and preserves state by `stableId`.
- **Single-object params** everywhere, except adapters that intentionally
  mirror web APIs (`CanvasContext`).
- **Fail loud** in render/FFI/stateful paths; no defensive recovery.
- **docs-as-code** — every subsystem gets a doc in `docs/` that is the
  authoritative reference, updated with the code.
