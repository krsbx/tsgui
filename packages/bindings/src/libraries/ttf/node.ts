/** SDL3_ttf backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { ttfDefs } from "./generated/defs-node.ts";
import { createTtfFunctions, type TtfFunctions } from "./generated/functions.ts";
import type { TtfSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";
import { wrapStringReturns } from "../../string-returns.ts";

const raw = wrapStringReturns(
  ttfDefs,
  dlopen(resolveLibrary(), ttfDefs).functions
) as unknown as TtfSymbols;

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const ttfRaw: TtfSymbols = raw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const ttf: TtfFunctions = createTtfFunctions(raw);
