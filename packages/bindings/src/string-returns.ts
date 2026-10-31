/**
 * NODE-ONLY helper — imports node:ffi, so it must never be imported from
 * a bun-loaded module.
 *
 * node:ffi (experimental) returns raw addresses for `'string'` return
 * types instead of JS strings. This wraps every string-returning function
 * of a dlopen table so behavior matches the bun:ffi backend.
 */
import { toString as ffiToString } from "node:ffi";
import type { FnDef } from "./resolve-defs";

export function wrapStringReturns<
  T extends Record<string, FnDef>,
  U extends Record<string, (...args: never[]) => unknown>,
>(defs: T, functions: U): U {
  return Object.fromEntries(
    Object.entries(defs).map(([name, def]) => {
      const fn = functions[name]!;
      if ((def as { return?: string }).return !== "string") return [name, fn];
      return [
        name,
        (...args: never[]) => {
          const result = (fn as (...a: unknown[]) => unknown)(...args);
          if (typeof result === "string") return result;
          if (result === null || result === undefined) return null;
          return ffiToString(BigInt(result as number));
        },
      ];
    })
  ) as U;
}
