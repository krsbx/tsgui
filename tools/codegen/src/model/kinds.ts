/** Normalized C argument/return kinds and their classification. */
import type { CTypeDecl } from "../clang/types";

/** Normalized C argument/return kinds, backend-mappable. */
export type FfiType =
  | "void"
  | "bool"
  | "i8"
  | "u8"
  | "i16"
  | "u16"
  | "i32"
  | "u32"
  | "i64"
  | "u64"
  | "f32"
  | "f64"
  | "string" // const char*
  | "pointer"; // everything else through a pointer

export const PRIMITIVES: Record<string, FfiType> = {
  void: "void",
  bool: "bool",
  _Bool: "bool",
  char: "i8",
  "signed char": "i8",
  "unsigned char": "u8",
  short: "i16",
  "unsigned short": "u16",
  int: "i32",
  "unsigned int": "u32",
  long: "i64",
  "unsigned long": "u64",
  "long long": "i64",
  "unsigned long long": "u64",
  int8_t: "i8",
  uint8_t: "u8",
  int16_t: "i16",
  uint16_t: "u16",
  int32_t: "i32",
  uint32_t: "u32",
  int64_t: "i64",
  uint64_t: "u64",
  size_t: "u64",
  intptr_t: "i64",
  uintptr_t: "u64",
  float: "f32",
  double: "f64",
};

export function classifyFfiType(
  t0: CTypeDecl,
  aliases: Map<string, CTypeDecl>,
  enumNames: Set<string>
): FfiType | null {
  // clang drops desugaredQualType on function types, so SDL typedef names
  // (Uint16, Sint32, …) survive into returnType — resolve through the
  // header's own typedefs, with a cycle guard.
  let t = t0;
  for (let i = 0; aliases.has(t.name) && i < 8; i++) {
    t = aliases.get(t.name)!;
  }

  // Enums by value are machine ints.
  if (t.pointerDepth === 0 && enumNames.has(t.name)) return "i32";

  if (t.isFunctionPointer) return null;
  if (t.pointerDepth === 0) {
    return PRIMITIVES[t.name] ?? null; // null = struct/union by value
  }
  // Depth >= 1: pointers. const char* is a string; everything else is raw.
  if (t.name === "char" && t.isConst) return "string";
  return "pointer";
}

/** Scalar TS type per FfiType, position-aware (64-bit ints cross as bigint). */
export function scalarTs(kind: FfiType, position: "param" | "return"): string {
  switch (kind) {
    case "void":
      return position === "return" ? "void" : "never";
    case "bool":
      return "boolean";
    case "i64":
    case "u64":
      return position === "param" ? "number | bigint" : "bigint";
    case "i8":
    case "u8":
    case "i16":
    case "u16":
    case "i32":
    case "u32":
    case "f32":
    case "f64":
      return "number";
    case "string":
      // C char* is nullable unless documented otherwise — SDL's
      // SDL_CreateRenderer(w, null)-style default-arg patterns rely on it.
      return position === "param" ? "string | null" : "string";
    case "pointer":
      throw new Error("pointer kinds must go through classifyPointerTs");
  }
}
