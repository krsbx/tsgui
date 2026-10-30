/** SDL3 backend for Node — node:ffi dlopen over the generated table.
 *
 * 'string' returns are converted; see git history / libraries/sdl for why
 * (node:ffi returns raw addresses for declared-string returns).
 */
import { dlopen, toString as ffiToString } from "node:ffi";
import { sdlDefs } from "./generated/defs-node.ts";
import { createSdlFunctions, type SdlFunctions } from "./generated/functions.ts";
import type { SdlSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";

const { functions } = dlopen(resolveLibrary(), sdlDefs);

const raw = Object.fromEntries(
  Object.entries(sdlDefs).map(([fnName, def]) => {
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
) as unknown as SdlSymbols;

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const sdlRaw: SdlSymbols = raw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const sdl: SdlFunctions = createSdlFunctions(raw);
