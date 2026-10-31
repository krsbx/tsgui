/** image backend for Bun — bun:ffi dlopen over the neutral defs table. */
import { dlopen } from "bun:ffi";
import { toBunDefs } from "../../bun-dialect.ts";
import { resolveDefs } from "../../resolve-defs.ts";
import { imageDefs } from "./generated/defs.ts";
import { createImageFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

export const imageRaw = dlopen(
  resolveLibrary(),
  toBunDefs(resolveDefs(imageDefs))
).symbols;

/** Object-param surface — generated wrappers + extension, merged. */
export const image = createImageFunctions(imageRaw);
