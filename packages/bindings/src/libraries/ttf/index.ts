/** SDL3_ttf bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { TtfSymbols } from "./generated/types.ts";
export type { TtfFunctions } from "./generated/functions.ts";
import type { TtfSymbols, TtfFunctions } from "./generated/functions.ts";

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const ttfRaw: TtfSymbols = backend.ttfRaw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const ttf: TtfFunctions = backend.ttf;
