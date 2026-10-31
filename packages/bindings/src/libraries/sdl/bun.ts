/** SDL3 backend for Bun — bun:ffi dlopen over the neutral defs table. */
import { dlopen } from "bun:ffi";
import { toBunDefs } from "../../bun-dialect.ts";
import { resolveDefs } from "../../resolve-defs.ts";
import { sdlDefs } from "./generated/defs.ts";
import { createSdlFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const sdlRaw = dlopen(
  resolveLibrary(),
  toBunDefs(resolveDefs(sdlDefs))
).symbols;

/** Object-param surface — generated wrappers + extension, merged. */
export const sdl = createSdlFunctions(sdlRaw);
