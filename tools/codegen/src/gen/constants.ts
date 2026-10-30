/** Generator for the per-library constants file (enums + numeric defines). */
import type { FfiTables } from '../model';
import { banner } from './shared';

export function generateFfiConstants(
  tables: FfiTables,
  origin: string,
  defines: { name: string; value: number }[] = [],
  definesExportName = 'Defines'
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
      L.push(`  ${d.name}: ${d.value},`);
    }
    L.push(`} as const;`);
    L.push(``);
  }
  return L.join('\n');
}
