/** SDL3_ttf bindings. Pointer values are opaque and backend-specific. */
import { createRequire } from "node:module";
import { lazyload } from "../../ffi.ts";
import { runtime } from "../../runtime.ts";

export type { TtfExtensionSymbols } from "./extension.ts";
export * from "./generated/constants.ts";
export type { TtfSymbols } from "./generated/types.ts";

type Backend = Awaited<typeof import("./node.ts")>;

const backend = lazyload<Backend>(() => {
  const esmRequire = createRequire(import.meta.url);

  return runtime === "bun" ? esmRequire("./bun.ts") : esmRequire("./node.ts");
});

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const ttfRaw = lazyload(() => backend.ttfRaw);

/** Object-param surface — generated wrappers + extension, merged. */
export const ttf = lazyload(() => backend.ttf);
