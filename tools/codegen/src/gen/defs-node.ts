/** Generator for the node:ffi dlopen table. */
import type { FfiTables } from '../model';
import { banner, KIND_BACKEND_TYPES } from './shared';

export function generateNodeDefs(
  tables: FfiTables,
  origin: string,
  defsExportName: string
): string {
  const L = banner(origin);
  L.push(`/** node:ffi dlopen table for ${origin} (Node >= 26.9). */`);
  L.push(`export const ${defsExportName} = {`);
  for (const fn of tables.functions) {
    const args =
      fn.args.length === 0
        ? `[]`
        : `[${fn.args.map((a) => JSON.stringify(KIND_BACKEND_TYPES[a.kind].node)).join(', ')}]`;
    L.push(`  ${fn.name}: { arguments: ${args}, return: ${JSON.stringify(KIND_BACKEND_TYPES[fn.returns.kind].node)} },`);
  }
  L.push(`} as const;`);
  L.push(``);
  return L.join('\n');
}
