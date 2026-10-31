/**
 * BUN-ONLY — imports bun:ffi, never import from a node-loaded module.
 *
 * Remaps the backend-neutral defs dialect (node:ffi type names) into
 * bun:ffi FFIType values for dlopen.
 */
import { FFIType, type FFITypeStringToType } from "bun:ffi";
import type {
  ArgumentType as FFIArgumentType,
  ReturnType as FFIReturnType,
} from "node:ffi";
import type { FnDef } from "./resolve-defs.ts";

const BY_NAME = {
  bool: "bool",
  int8: "i8",
  uint8: "u8",
  int16: "i16",
  uint16: "u16",
  int32: "i32",
  uint32: "u32",
  int64: "i64",
  uint64: "u64",

  // node:ffi aliases
  float: "f32",
  f32: "f32",
  f64: "f64",
  double: "f64",
  // 'short' names
  i8: "i8",
  u8: "u8",
  i16: "i16",
  u16: "u16",
  i32: "i32",
  u32: "u32",
  i64: "i64",
  u64: "u64",
  string: "cstring",
  pointer: "pointer",
  ptr: "pointer",
  str: "cstring",
  void: "void",

  char: "char",
  buffer: "buffer",
  function: "function",
  arraybuffer: "buffer",
} satisfies Record<FFIReturnType, keyof FFITypeStringToType>;

export interface BunFnDef {
  args: FFIType[];
  returns?: FFIType;
}

type FunctionDefinitions = {
  [symbols: string]: FnDef;
};

// Resolve by assignability rather than indexing, so `handle<T>()` slots
// (`"pointer"` & a type-only brand) still map to their bun name.
type BunFFIArgument<T extends FFIReturnType> = {
  [N in keyof typeof BY_NAME]: [T] extends [N] ? (typeof BY_NAME)[N] : never;
}[keyof typeof BY_NAME];

type BunFFIArguments<Args extends readonly FFIArgumentType[]> = {
  -readonly [K in keyof Args]: BunFFIArgument<Args[K]>;
};

export type BunDefs<T extends FunctionDefinitions> = {
  [K in keyof T]: {
    args: BunFFIArguments<T[K]["arguments"]>;
    returns: BunFFIArgument<T[K]["return"]>;
  };
};

export function toBunDefs<T extends FunctionDefinitions>(defs: T): BunDefs<T> {
  const lookup = (t: FFIReturnType, name: string) => {
    const mapped = BY_NAME[t];
    if (!mapped) throw new Error(`toBunDefs: unknown type "${t}" (in ${name})`);
    return mapped;
  };
  return Object.fromEntries(
    Object.entries(defs).map(([name, def]) => [
      name,
      {
        args: def.arguments.map((a) => lookup(a, name)),
        returns: lookup(def.return, name),
      },
    ])
  ) as BunDefs<T>;
}
