/** SDL3 backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { sdlDefs } from "./generated/defs-node.ts";
import { createSdlFunctions, type SdlFunctions } from "./generated/functions.ts";
import type { SdlSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";
import { wrapStringReturns } from "../../string-returns.ts";

const raw = wrapStringReturns(
  sdlDefs,
  dlopen(resolveLibrary(), sdlDefs).functions
) as unknown as SdlSymbols;

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const sdlRaw: SdlSymbols = raw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const sdl: SdlFunctions = createSdlFunctions(raw);
