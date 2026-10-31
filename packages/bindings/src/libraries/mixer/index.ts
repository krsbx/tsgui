/** SDL3_mixer bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { MixerSymbols } from "./generated/types.ts";
export type { MixerFunctions } from "./generated/functions.ts";
import type { MixerSymbols } from "./generated/types.ts";
import { asMixerSymbols, type MixerFunctions } from "./generated/functions.ts";

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const mixerRaw: MixerSymbols = asMixerSymbols(backend.mixerRaw);

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const mixer: MixerFunctions = backend.mixer;
