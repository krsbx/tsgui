/** SDL3_mixer bindings. Pointer values are opaque and backend-specific. */
import { createRequire } from "node:module";
import { lazyload } from "../../ffi.ts";
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { MixerFunctions } from "./generated/functions.ts";
export type { MixerSymbols } from "./generated/types.ts";

type Backend = Awaited<typeof import("./node.ts")>;

const backend = lazyload<Backend>(() => {
  const esmRequire = createRequire(import.meta.url);

  return runtime === "bun" ? esmRequire("./bun.ts") : esmRequire("./node.ts");
});

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const mixerRaw = lazyload(() => backend.mixerRaw);

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const mixer = lazyload(() => backend.mixer);
