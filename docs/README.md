# vulcania — Plan & Architecture Docs

vulcania is a from-the-ground-up retained-mode GUI toolkit for Node/Bun. It is a
rewrite of the ideas proven in [flying-pan](https://github.com/krsbx/flying-pan),
restructured around three goals flying-pan lacked:

1. **A chunky native boundary** — thousands of tiny FFI calls per frame become
   a handful of bulk buffer uploads.
2. **Strict layering** — layout, reconciliation, and frame encoding are pure
   TypeScript with zero FFI imports, so they are unit-testable and debuggable
   in isolation.
3. **Observability from day one** — headless snapshot testing and a devtools
   server, not printf debugging.

## Doc index

| Doc                                  | Covers                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Monorepo package layout, layering rules, frame loop, threading model                                |
| [CONVENTIONS.md](./CONVENTIONS.md)   | The codebase rules — enums over string literals, named types, wrapped bindings, verification matrix |
| [FFI.md](./FFI.md)                   | Runtime-split dlopen (bun:ffi / node:ffi), tables generated from SDL3 headers, FFI-safety filter    |
| [PLATFORM.md](./PLATFORM.md)         | SDL3 platform, hardcore binding tiers, batched renderer on SDL_Renderer (zero C)                    |
| [LAYOUT.md](./LAYOUT.md)             | The flexbox engine: minimal injected LayoutContext, semantics, engine map, headless testing         |
| [RENDERING.md](./RENDERING.md)       | Batched renderer, vertex format, SDF shapes, fonts, canvas/SVG strategy                             |
| [ROADMAP.md](./ROADMAP.md)           | Build phases with exit criteria                                                                     |

## Diagnosis: why flying-pan is hard to scale

flying-pan's fundamentals are sound (declarative rebuild + reconciler, Clang
AST codegen, flexbox engine, good docs culture). The scaling pain comes from
three places:

- **Chatty FFI + immediate-mode GL.** Every rect/arc/text quad is a separate
  `glBegin/glEnd` call through `bun:ffi`. A few hundred widgets produce
  thousands of FFI calls per frame — each with trampoline overhead, on the
  slowest GL path that exists.
- **Renderer coupling.** Layout, paint, and interactions all walk the live
  widget tree with GL calls inline. No layer can be tested without a window
  and a GPU context, so every bug requires running the whole app.
- **No observation tooling.** At 58k lines, with no inspector, every bug is
  guesswork across layers.

The rewrite keeps the proven concepts and fixes the boundary, the layering,
and the tooling.

## Non-goals (v1)

- Accessibility tree / screen-reader support (tracked, deferred).
- IME / complex text shaping (HarfBuzz-class). Plain UTF-8 text only.
- Feature parity with Electron/Qt. This is a framework project; scope is
  controlled deliberately.
- Mobile targets (sokol would allow them later; not a v1 concern).
