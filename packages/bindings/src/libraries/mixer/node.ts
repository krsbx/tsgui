/** mixer backend for Node — node:ffi consumes the neutral defs natively. */
import { dlopen } from "node:ffi";
import { resolveDefs } from "../../resolve-defs.ts";
import { wrapStringReturns } from "../../string-returns.ts";
import { mixerDefs } from "./generated/defs.ts";
import { createMixerFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

const defs = resolveDefs(mixerDefs);

/** Raw positional symbols — includes the extension functions. */
export const mixerRaw = wrapStringReturns(
  defs,
  dlopen(resolveLibrary(), defs).functions
);

/** Object-param surface — generated wrappers + extension, merged. */
export const mixer = createMixerFunctions(mixerRaw);
