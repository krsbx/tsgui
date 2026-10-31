import type {
  ArgumentType as FFIArgumentType,
  ReturnType as FFIReturnType,
} from "node:ffi";

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
