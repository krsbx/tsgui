/** Shared data shapes of the FFI model. */
import type { FfiType } from "./kinds.ts";

export interface FfiArg {
  name: string;
  kind: FfiType;
  /** The exact TypeScript type emitted for this argument. */
  ts: string;
}

export interface FfiReturn {
  kind: FfiType;
  ts: string;
}

export interface FfiFunction {
  name: string;
  returns: FfiReturn;
  args: FfiArg[];
}

export interface UnsafeFunction {
  name: string;
  reason: string;
}

export interface FfiEnum {
  cName: string;
  tsName: string;
  constants: { name: string; value: number }[];
}

export interface FfiTables {
  functions: FfiFunction[];
  unsafe: UnsafeFunction[];
  enums: FfiEnum[];
  /** Opaque handle type names referenced by functions (brand list). */
  handleTypes: string[];
}

export interface FfiFilterOptions {
  /** Only symbols whose names start with one of these prefixes (e.g. "SDL_"). */
  namePrefixes: string[];
}
