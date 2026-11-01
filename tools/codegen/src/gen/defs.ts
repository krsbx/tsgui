/**
 * Generator for the backend-neutral dlopen table (node:ffi dialect).
 *
 * One defs file per library — node consumes it natively; bun remaps type
 * names to FFIType at load time (see @tsgui/bindings bun-dialect.ts).
 */
import type { ReturnType as FFIReturnType } from "node:ffi";
import type { FfiTables } from "../model/index.ts";
import { banner } from "./shared.ts";

/** C kind → node:ffi type string (the neutral dialect). */
const NEUTRAL_TYPE = {
  void: "void",
  bool: "bool",
  i8: "int8",
  u8: "uint8",
  i16: "int16",
  u16: "uint16",
  i32: "int32",
  u32: "uint32",
  i64: "int64",
  u64: "uint64",
  f32: "float",
  f64: "f64",
  string: "string",
  pointer: "pointer",
} satisfies Record<string, FFIReturnType>;

export function generateDefs(
  tables: FfiTables,
  origin: string,
  defsExportName: string
): string {
  const L = banner(origin);
  L.push(`import type { FunctionSignature } from "node:ffi";`);
  L.push(``);
  L.push(
    `/** Backend-neutral dlopen table for ${origin} (node:ffi dialect). */`
  );
  L.push(`export const ${defsExportName} = {`);
  for (const fn of tables.functions) {
    const args =
      fn.args.length === 0
        ? `[]`
        : `[${fn.args.map((a) => JSON.stringify(NEUTRAL_TYPE[a.kind])).join(", ")}]`;
    L.push(
      `  ${fn.name}: { arguments: ${args}, return: ${JSON.stringify(NEUTRAL_TYPE[fn.returns.kind])} },`
    );
  }
  L.push(`} as const satisfies Record<string, FunctionSignature>;`);
  L.push(``);
  return L.join("\n");
}
