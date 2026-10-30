/** SDL3 backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { sdlDefs } from "./generated/defs-bun.ts";
import { createSdlFunctions, type SdlFunctions } from "./generated/functions.ts";
import type { SdlSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const sdlRaw: SdlSymbols = dlopen(
  resolveLibrary(),
  sdlDefs
).symbols as unknown as SdlSymbols;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const sdl: SdlFunctions = createSdlFunctions(sdlRaw);
