/** SDL3_mixer backend for Node — node:ffi dlopen over the generated table.
 *
 * 'string' returns are converted; see git history / libraries/sdl for why
 * (node:ffi returns raw addresses for declared-string returns).
 */
import { dlopen, toString as ffiToString } from "node:ffi";
import { mixerDefs } from "./generated/defs-node.ts";
import { createMixerFunctions, type MixerFunctions } from "./generated/functions.ts";
import type { MixerSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";

const { functions } = dlopen(resolveLibrary(), mixerDefs);

const raw = Object.fromEntries(
  Object.entries(mixerDefs).map(([fnName, def]) => {
    const fn = functions[fnName]!;
    if ((def as { return?: string }).return !== "string") return [fnName, fn];
    return [
      fnName,
      (...args: never[]) => {
        const result = (fn as (...a: unknown[]) => unknown)(...args);
        if (typeof result === "string") return result;
        if (result === null || result === undefined) return null;
        return ffiToString(BigInt(result as number));
      },
    ];
  })
) as unknown as MixerSymbols;

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const mixerRaw: MixerSymbols = raw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const mixer: MixerFunctions = createMixerFunctions(raw);
