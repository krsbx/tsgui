/** shadercross backend for Bun — bun:ffi dlopen over the neutral defs table. */
import { dlopen } from "bun:ffi";
import { toBunDefs } from "../../bun-dialect.ts";
import { resolveDefs } from "../../resolve-defs.ts";
import { shadercrossDefs } from "./generated/defs.ts";
import { createShadercrossFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

export const shadercrossRaw = dlopen(
  resolveLibrary(),
  toBunDefs(resolveDefs(shadercrossDefs))
).symbols;

/** Object-param surface — generated wrappers + extension, merged. */
export const shadercross = createShadercrossFunctions(shadercrossRaw);
