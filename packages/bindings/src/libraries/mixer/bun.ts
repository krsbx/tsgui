/** mixer backend for Bun — bun:ffi dlopen over the neutral defs table. */
import { dlopen } from "bun:ffi";
import { toBunDefs } from "../../bun-dialect.ts";
import { resolveDefs } from "../../resolve-defs.ts";
import { mixerDefs } from "./generated/defs.ts";
import { createMixerFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

export const mixerRaw = dlopen(
  resolveLibrary(),
  toBunDefs(resolveDefs(mixerDefs))
).symbols;

/** Object-param surface — generated wrappers + extension, merged. */
export const mixer = createMixerFunctions(mixerRaw);
