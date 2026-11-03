/** SDL3_shadercross bindings. Pointer values are opaque and backend-specific. */
import { createRequire } from "node:module";
import { lazyload } from "../../ffi.ts";
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { ShadercrossFunctions } from "./generated/functions.ts";
export type { ShadercrossSymbols } from "./generated/types.ts";

type Backend = Awaited<typeof import("./node.ts")>;

const backend = lazyload<Backend>(() => {
  const esmRequire = createRequire(import.meta.url);

  return runtime === "bun" ? esmRequire("./bun.ts") : esmRequire("./node.ts");
});

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const shadercrossRaw = lazyload(() => backend.shadercrossRaw);

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const shadercross = lazyload(() => backend.shadercross);
