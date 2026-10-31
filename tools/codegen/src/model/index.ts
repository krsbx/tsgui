/**
 * Semantic model of an FFI surface, derived from parsed Clang AST dumps.
 *
 * `buildFfiTables` produces the dlopen tables for both backends
 * (bun:ffi / node:ffi). Functions that are not FFI-safe (struct-by-value,
 * callbacks, variadics) are filtered and reported, never silently dropped.
 *
 * If a compiled addon (N-API) is ever wanted again, write a generator
 * against these parsed types — do not resurrect the old hand-classified
 * object-bridge model (see docs/FFI.md historical notes).
 */
export { buildFfiTables } from "./tables.ts";
export { camelize, pascalCase } from "./names.ts";
export type { FfiType } from "./kinds.ts";
export type {
  FfiArg,
  FfiEnum,
  FfiFilterOptions,
  FfiFunction,
  FfiReturn,
  FfiTables,
  UnsafeFunction,
} from "./interfaces.ts";
