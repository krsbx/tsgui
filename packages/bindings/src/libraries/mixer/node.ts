/** SDL3_mixer backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { mixerDefs } from "./generated/defs-node.ts";
import { createMixerFunctions, type MixerFunctions } from "./generated/functions.ts";
import type { MixerSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";
import { wrapStringReturns } from "../../string-returns.ts";

const raw = wrapStringReturns(
  mixerDefs,
  dlopen(resolveLibrary(), mixerDefs).functions
) as unknown as MixerSymbols;

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const mixerRaw: MixerSymbols = raw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const mixer: MixerFunctions = createMixerFunctions(raw);
