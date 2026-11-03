/** SDL3_image bindings. Pointer values are opaque and backend-specific. */
import { createRequire } from "node:module";
import { lazyload } from "../../ffi.ts";
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { ImageFunctions } from "./generated/functions.ts";
export type { ImageSymbols } from "./generated/types.ts";

type Backend = Awaited<typeof import("./node.ts")>;

const backend = lazyload<Backend>(() => {
  const esmRequire = createRequire(import.meta.url);

  return runtime === "bun" ? esmRequire("./bun.ts") : esmRequire("./node.ts");
});

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const imageRaw = lazyload(() => backend.imageRaw);

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const image = lazyload(() => backend.image);
