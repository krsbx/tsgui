/** SDL3_ttf backend for Node — node:ffi dlopen over the generated table.
 *
 * 'string' returns are converted; see git history / libraries/sdl for why
 * (node:ffi returns raw addresses for declared-string returns).
 */
import { dlopen, toString as ffiToString } from "node:ffi";
import { ttfDefs } from "./generated/defs-node.ts";
import { createTtfFunctions, type TtfFunctions } from "./generated/functions.ts";
import type { TtfSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";

const { functions } = dlopen(resolveLibrary(), ttfDefs);

const raw = Object.fromEntries(
  Object.entries(ttfDefs).map(([fnName, def]) => {
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
) as unknown as TtfSymbols;

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const ttfRaw: TtfSymbols = raw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const ttf: TtfFunctions = createTtfFunctions(raw);
