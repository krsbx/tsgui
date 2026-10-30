/** Generator for the bun:ffi dlopen table. */
import type { FfiTables } from '../model';
import { banner, KIND_BACKEND_TYPES } from './shared';

export function generateBunDefs(
  tables: FfiTables,
  origin: string,
  defsExportName: string
): string {
  const L = banner(origin);
  L.push(`import { FFIType } from "bun:ffi";`);
  L.push(``);
  L.push(`/** bun:ffi dlopen table for ${origin}. */`);
  L.push(`export const ${defsExportName} = {`);
  for (const fn of tables.functions) {
    const args =
      fn.args.length === 0
        ? `[]`
        : `[${fn.args.map((a) => `FFIType.${KIND_BACKEND_TYPES[a.kind].bun}`).join(', ')}]`;
    // bun:ffi has no FFIType.void — omitting `returns` is the void form.
    const ret =
      fn.returns.kind === 'void'
        ? ''
        : `, returns: FFIType.${KIND_BACKEND_TYPES[fn.returns.kind].bun}`;
    L.push(`  ${fn.name}: { args: ${args}${ret} },`);
  }
  L.push(`} as const;`);
  L.push(``);
  return L.join('\n');
}
