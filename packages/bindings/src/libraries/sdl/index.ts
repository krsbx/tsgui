/** SDL3 bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { SdlSymbols } from "./generated/types.ts";
export type { SdlFunctions } from "./generated/functions.ts";
import type { SdlSymbols } from "./generated/types.ts";
import { asSdlSymbols, type SdlFunctions } from "./generated/functions.ts";

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const sdlRaw: SdlSymbols = asSdlSymbols(backend.sdlRaw);

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const sdl: SdlFunctions = backend.sdl;
