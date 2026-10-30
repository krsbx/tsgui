/** SDL3_ttf backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { ttfDefs } from "./generated/defs-bun.ts";
import { createTtfFunctions, type TtfFunctions } from "./generated/functions.ts";
import type { TtfSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const ttfRaw: TtfSymbols = dlopen(
  resolveLibrary(),
  ttfDefs
).symbols as unknown as TtfSymbols;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const ttf: TtfFunctions = createTtfFunctions(ttfRaw);
