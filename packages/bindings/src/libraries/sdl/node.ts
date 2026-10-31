/** SDL3 backend for Node — node:ffi consumes the neutral defs natively. */
import { dlopen } from "node:ffi";
import { resolveDefs } from "../../resolve-defs.ts";
import { wrapStringReturns } from "../../string-returns.ts";
import { sdlDefs } from "./generated/defs.ts";
import { createSdlFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

const defs = resolveDefs(sdlDefs);

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const sdlRaw = wrapStringReturns(
  defs,
  dlopen(resolveLibrary(), defs).functions
);

/** Object-param surface — generated wrappers + extension, merged. */
export const sdl = createSdlFunctions(sdlRaw);
