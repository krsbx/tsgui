/** Generator for the per-library constants file (enums + numeric defines). */
import type { DefineConstant } from "../defines.ts";
import type { FfiTables } from "../model/index.ts";
import { banner } from "./shared.ts";

export function generateFfiConstants(
  tables: FfiTables,
  origin: string,
  defines: DefineConstant[] = [],
  definesExportName = "Defines"
): string {
  const L = banner(origin);
  L.push(`/** Enum constants from ${origin}. */`);
  for (const e of tables.enums) {
    L.push(`export const ${e.tsName} = {`);
    for (const c of e.constants) {
      L.push(`  ${c.name}: ${c.value},`);
    }
    L.push(`} as const;`);
    L.push(``);
  }

  if (defines.length > 0) {
    L.push(`/** Numeric #define constants (invisible to the AST). */`);
    L.push(`export const ${definesExportName} = {`);
    for (const d of defines) {
      L.push(`  ${d.name}: ${d.hex ? hex(d.value) : d.value},`);
    }
    L.push(`} as const;`);
    L.push(``);
  }
  return L.join("\n");
}

/** Format as a hex literal, keeping the sign outside the 0x (-0x1, not 0x-1). */
function hex(n: number): string {
  return `${n < 0 ? "-" : ""}0x${Math.abs(n).toString(16).toUpperCase()}`;
}
