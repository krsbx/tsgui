# vulcania

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

## Pinned SDL headers

The headers codegen parses are pinned as git submodules under `vendor/`,
so the generated bindings match one exact version of each library on every
machine and in CI:

| Submodule                | Pinned at                                |
| ------------------------ | ---------------------------------------- |
| `vendor/SDL`             | `release-3.4.18`                         |
| `vendor/SDL_image`       | `release-3.4.8`                          |
| `vendor/SDL_ttf`         | `release-3.2.2`                          |
| `vendor/SDL_mixer`       | `release-3.2.4`                          |
| `vendor/SDL_shadercross` | `1ff05be` (upstream has no release tags) |

Things to know:

- **After cloning, run `node scripts/vendor-headers.ts` once** (or
  `bun run vendor`, which calls it). It's plain Node + git, so it works
  before `bun install`. It fetches the submodules shallowly and trims each
  one to `include/` + its license via sparse-checkout. Don't use `git clone --recursive` /
  `git submodule update --recursive`: their nested submodules (image
  codecs, DirectXShaderCompiler, …) are build inputs, several GB, and not
  needed for headers.
- **Sparse-checkout is per-clone state** — it isn't committed, so a plain
  `git submodule update --init` gives you the full source trees. Re-run
  `bun run vendor` to trim them again.
- **Submodules sit on a detached HEAD** (a pinned commit, no branch).
  That's normal.
- **Bumping a version** — move the pin, regenerate, commit both together:

  ```bash
  git -C vendor/SDL fetch --depth 1 origin tag release-3.4.20
  git -C vendor/SDL checkout release-3.4.20
  bun run codegen:all
  git add vendor/SDL packages/bindings packages/core
  ```

- **`VULCANIA_SDL3_INCLUDE`** overrides the submodules with one base
  include dir exposing `SDL3/`, `SDL3_image/`, … (e.g. a system install).
- **All five pins are codegen targets** — `SDL_shadercross` included
  (its bindings load lazily; the dylib is only needed on first
  `loadShaderCross()` call).
- **The submodules are headers only.** The runtime libraries still come
  from your system (`brew install …` above) or the repo releases —
  `bun run examples/download.ts` fetches the release dylibs into
  `examples/ffi/`, where `examples/setup.ts` (preloaded via
  `bunfig.toml`) points the `VULCANIA_SDL3_*_PATH` env vars.

## How it works

`tools/codegen` dumps the SDL3 family headers through clang's AST and
generates `bun:ffi` / `node:ffi` tables — flying-pan's "expose everything"
model, with FFI-unsafe functions (callbacks, struct-by-value, variadics)
filtered and reported. The entire toolkit — renderer included — stays pure
TypeScript: batched drawing goes through SDL_Renderer's GPU backend via
`SDL_RenderGeometryRaw`.

See [docs/](./docs/README.md) for the architecture and the full plan.
