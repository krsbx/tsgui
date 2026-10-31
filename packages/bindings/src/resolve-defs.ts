import type {
  ArgumentType as FFIArgumentType,
  ReturnType as FFIReturnType,
} from "node:ffi";
import type { AnyPointer } from "./libraries/sdl/generated/types.ts";

/**
 * Merge a generated defs table with any extension defs (see
 * libraries/<name>/extension.ts). Duplicate function names fail loud —
 * an extension shadowing a generated function is always a mistake.
 *
 * The output stays in the backend-neutral node:ffi dialect:
 *   - node loaders consume it directly
 *   - the bun loader remaps type names to FFIType (see bun-dialect.ts)
 */
export interface FnDef {
  arguments: readonly FFIArgumentType[];
  return: FFIReturnType;
}

declare const handleType: unique symbol;

/**
 * A `"pointer"` slot tagged with its branded handle type. Type-only: the
 * runtime value is the plain string `"pointer"`, so both backends consume
 * it unchanged while `SymbolsFromDefs` can recover the brand.
 */
export type Handle<T> = "pointer" & { readonly [handleType]?: T };

/** `"pointer"` slot typed as handle `T` — see `Handle`. */
export function handle<T>(): Handle<T> {
  return "pointer" as Handle<T>;
}

/** TS type of a def type name — mirrors codegen's `scalarTs`. */
type TsOf<T, Position extends "param" | "return"> =
  T extends Handle<infer H>
    ? unknown extends H
      ? AnyPointer | null
      : H | null
    : T extends "void"
      ? void
      : T extends "bool"
        ? boolean
        : T extends "i64" | "u64" | "int64" | "uint64"
          ? Position extends "param"
            ? number | bigint
            : bigint
          : T extends "string" | "str"
            ? Position extends "param"
              ? string | null
              : string
            : T extends "pointer" | "ptr" | "buffer" | "arraybuffer"
              ? AnyPointer | null
              : T extends "function"
                ? unknown
                : number;

/**
 * Positional symbol surface derived from a defs table, so extensions
 * don't hand-write a parallel interface. Tag pointer slots with
 * `handle<T>()` to keep branded handle types.
 */
export type SymbolsFromDefs<D extends Record<string, FnDef>> = {
  [K in keyof D]: (
    ...args: ParamsOf<D[K]["arguments"]>
  ) => TsOf<D[K]["return"], "return">;
};

// Separate type parameter so the mapped type stays homomorphic over the tuple.
type ParamsOf<A extends readonly FFIArgumentType[]> = {
  -readonly [I in keyof A]: TsOf<A[I], "param">;
};

export function resolveDefs<T extends Record<string, FnDef>>(source: T): T;
export function resolveDefs<T extends Record<string, FnDef>, U extends object>(
  source: T,
  extension: (symbols: T) => U
): T & U;
export function resolveDefs<T extends Record<string, FnDef>, U extends object>(
  source: T,
  extension: U
): T & U;
export function resolveDefs<T extends Record<string, FnDef>>(
  source: T,
  extension?: ((symbols: T) => object) | object
): Record<string, FnDef> {
  const out: Record<string, FnDef> = {};

  const tables = [
    source,
    extension
      ? typeof extension === "function"
        ? extension(source)
        : extension
      : {},
  ];

  for (const table of tables) {
    for (const [name, def] of Object.entries(table)) {
      if (name in out) {
        throw new Error(`resolveDefs: duplicate function "${name}"`);
      }
      out[name] = def as FnDef;
    }
  }

  return out;
}
