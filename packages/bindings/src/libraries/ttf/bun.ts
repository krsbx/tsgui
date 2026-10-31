/** ttf backend for Bun — bun:ffi dlopen over the neutral defs table. */
import { dlopen } from "bun:ffi";
import { toBunDefs } from "../../bun-dialect.ts";
import { resolveDefs } from "../../resolve-defs.ts";
import { ttfExtension, ttfExtensionDefs } from "./extension.ts";
import { ttfDefs } from "./generated/defs.ts";
import { createTtfFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

/** Raw positional symbols — includes the extension functions. */
export const ttfRaw = dlopen(
  resolveLibrary(),
  toBunDefs(resolveDefs(ttfDefs, ttfExtensionDefs))
).symbols;

/** Object-param surface — generated wrappers + extension, merged. */
export const ttf = createTtfFunctions(ttfRaw, ttfExtension);
