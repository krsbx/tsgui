/** ttf backend for Node — node:ffi consumes the neutral defs natively. */
import { dlopen } from "node:ffi";
import { resolveDefs } from "../../resolve-defs.ts";
import { wrapStringReturns } from "../../string-returns.ts";
import { ttfExtension, ttfExtensionDefs } from "./extension.ts";
import { ttfDefs } from "./generated/defs.ts";
import { createTtfFunctions } from "./generated/functions.ts";
import { resolveLibrary } from "./path.ts";

const defs = resolveDefs(ttfDefs, ttfExtensionDefs);

/** Raw positional symbols — includes the extension functions. */
export const ttfRaw = wrapStringReturns(
  defs,
  dlopen(resolveLibrary(), defs).functions
);

/** Object-param surface — generated wrappers + extension, merged. */
export const ttf = createTtfFunctions(ttfRaw, ttfExtension);
