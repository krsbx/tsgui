/** SDL3_mixer backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { mixerDefs } from "./generated/defs-bun.ts";
import { createMixerFunctions, type MixerFunctions } from "./generated/functions.ts";
import type { MixerSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const mixerRaw: MixerSymbols = dlopen(
  resolveLibrary(),
  mixerDefs
).symbols as unknown as MixerSymbols;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const mixer: MixerFunctions = createMixerFunctions(mixerRaw);
