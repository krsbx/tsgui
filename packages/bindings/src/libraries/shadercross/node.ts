/** shadercross backend for Node — node:ffi consumes the neutral defs natively. */
import { dlopen } from "node:ffi";
import { resolveDefs } from "../../resolve-defs.ts";
import { wrapStringReturns } from "../../string-returns.ts";
import { shadercrossDefs } from "./generated/defs.ts";
import { createShadercrossFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

const defs = resolveDefs(shadercrossDefs);

/** Raw positional symbols — includes the extension functions. */
export const shadercrossRaw = wrapStringReturns(
  defs,
  dlopen(resolveLibrary(), defs).functions
);

/** Object-param surface — generated wrappers + extension, merged. */
export const shadercross = createShadercrossFunctions(shadercrossRaw);
