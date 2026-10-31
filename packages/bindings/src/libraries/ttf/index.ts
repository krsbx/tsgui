/** SDL3_ttf bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { TtfSymbols } from "./generated/types.ts";
export type { TtfExtensionSymbols } from "./extension.ts";

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const ttfRaw = backend.ttfRaw;

/** Object-param surface — generated wrappers + extension, merged. */
export const ttf = backend.ttf;
