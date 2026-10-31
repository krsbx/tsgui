# tsgui

A from-the-ground-up retained-mode GUI toolkit for Node and Bun, built
directly on SDL3 through runtime FFI — no compiled addon, no build step.

**Status:** Phase 0 complete — SDL3 bound via generated FFI tables
(1087 functions), clear-color window demo running on Bun and Node ≥ 26.9.

## Quick start

```bash
bun install
bun run smoke              # headless: load SDL3, print version
bun run hello              # open the phase-0 demo window
bun run hello -- --selftest  # 120 frames then exit (CI-safe)
```

Requires [Bun](https://bun.com) and SDL3 plus its image/ttf/mixer libraries
(`brew install sdl3 sdl3_image sdl3_ttf sdl3_mixer` on macOS).
Node 26.9+ works too via `node:ffi`.

## How it works

`tools/codegen` dumps the SDL3 family headers through clang's AST and
generates `bun:ffi` / `node:ffi` tables — flying-pan's "expose everything"
model, with FFI-unsafe functions (callbacks, struct-by-value, variadics)
filtered and reported. The entire toolkit — renderer included — stays pure
TypeScript: batched drawing goes through SDL_Renderer's GPU backend via
`SDL_RenderGeometryRaw`.

See [docs/](./docs/README.md) for the architecture and the full plan.
