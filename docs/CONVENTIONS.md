# Codebase conventions

The rules of this repository, written down so nobody has to repeat them.
Every entry here was a real correction at some point — treat them as
enforced, not advisory. ESLint carries what it can (import boundaries,
unused vars, formatting); the rest is review discipline.

## Runtime & architecture

- **Zero C, zero compiled artifacts.** Everything goes through dlopen FFI —
  `bun:ffi` on Bun, `node:ffi` (Node ≥ 26.9) on Node. No N-API addons, no
  build step; `libvulcania` is permanently retired (see PLATFORM.md).
- **Both runtimes, always.** A feature isn't done until its selftest passes
  on Bun _and_ Node. Node strips types only — no parameter properties
  (`constructor(private x)` is rejected at runtime), no TS `enum` values,
  nothing else that needs real codegen.
- **flying-pan is the spec.** Port its patterns (per-widget modules, paint
  order, design tokens, reconciler, dispatcher) rather than inventing
  parallel structures. When comparing implementations, parity wins.

## TypeScript style

- **Const-object enums, never string-literal unions.** A value from a
  closed set gets `export const Foo = { A: "a", B: "b" } as const` +
  `export type Foo = (typeof Foo)[keyof typeof Foo]` — props, style
  fields, op discriminators, zones, directions, everything. Field types
  reference the enum type (`textAlign?: TextAlign`), never the literal
  union. This has been corrected three separate times; assume any new
  `| "…"` union is a bug.
- **Enums and functions live in runtime modules; types-only files carry
  no runtime code.** Each package keeps its closed sets in `enums.ts`
  (or the runtime module that owns them — a widget's domain enum sits
  with its logic, design tokens in `design.ts`). A `types.ts` exports
  interfaces and type aliases only — no `export const` enums, no
  helpers (`propsOf` lives in `props.ts`, `rgba` in gpu's `color.ts`).
  Generated code is exempt. When adding an enum, check it isn't already
  exported by another package or by the generated bindings — names are
  global through the barrels and the root re-export.
- **Named, reusable types — no inline object literals in signatures.**
  Define `interface FooOptions`; extend shared bases so types compose
  (`RectOptions extends Rect`, `RoundedRectOptions extends RectOptions`).
  If a type would be duplicated across packages, the base lives in the
  lower package and the upper imports it.
- **Single-object params** (see ARCHITECTURE.md) — one options object,
  destructured; no positional argument lists.
- **No duplication.** When a pattern appears twice — a ternary pair, a
  destructure-and-forward, a corner branch — extract a helper
  (`mainMargin`, `createWidget`, `fillShape`, `resolveConstraint`). Two
  occurrences is already once too many.
- Import order/formatting is tool-enforced; keep `bun run lint` at zero.

## FFI & bindings

- **Use the wrapped object-param surface** (`sdl`, `ttf`, `image`,
  `mixer`) — one options object per call. The raw positional surface
  (`sdlRaw`) is a documented escape hatch for bindings internals, not for
  toolkit or example code.
- FFI-unsafe functions (string returns, size_t, out-params) go through the
  extension way — `libraries/<name>/extension.ts` in the neutral defs
  dialect (see FFI.md).
- **SDL fails silently.** Calls can return success while drawing nothing
  (the vertex-ABI bug), and error strings are sticky. Verify pixels, not
  return codes; `SDL_ClearError` before fallbacks so thrown errors name
  the real failure.

## Workspace

- Workspace dependencies use `workspace:*` versions.
- Examples import upper-layer packages through root `devDependencies`
  (the linking convention).

## Testing & verification — before every commit

```
bun run typecheck && bun run lint && bun test
bun run smoke && bun run examples/showcase.ts --selftest && bun run examples/gallery.ts --selftest
# and the node:ffi side (Node ≥ 26.9):
bun run smoke:node && node examples/gallery.ts --selftest
```

- Don't pipe verification through `| tail` (it masks exit codes); read the
  real tail of output instead.
- **Rendering changes need pixel-level proof.** Op-count selftests cannot
  see pixels — two shipped regressions (vertex ABI, batch contamination)
  were invisible to them. New renderer behavior gets a software-driver
  readback test (`SDL_RenderReadPixels` + `SDL_ReadSurfacePixelFloat`,
  skipped on headless CI).
- **Mutation-check new guards.** A test only proves anything if it fails
  when the bug is re-injected.
- Golden snapshots: `.snap` files are committed; CI compares, never
  writes.

## Process

- **Incremental conventional commits** (`feat`/`fix`/`refactor`/`docs`/
  `test`), one logical unit each, verified before committing.
- **ROADMAP.md is the status of record.** Check off completed work with
  dates, reconcile superseded items instead of leaving them open, and
  correct stale claims (a doc that says "20-byte vertex" in an era of
  32-byte floats misleads everyone).
- Docs move with the code — a decision that changed (zero-C, tier
  supersessions) gets recorded where the old decision lives.
