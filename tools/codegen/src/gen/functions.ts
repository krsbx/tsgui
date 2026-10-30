/**
 * Generator for the single-object-param wrapper surface
 * (`<Lib>Functions` + the `create<Lib>Functions()` factory).
 */
import type { FfiTables } from '../model';
import { banner } from './shared';

export function generateFunctions(tables: FfiTables, pascalName: string): string {
  const L = banner(`single-object-param wrappers for ${pascalName}`);
  // types.ts re-exports core brands for satellite libraries, so a single
  // local import covers Symbols, brands, and buffer types.
  const blob = tables.functions
    .map((f) => [f.returns.ts, ...f.args.map((a) => a.ts)].join('\n'))
    .join('\n');
  const used = new Set<string>([`${pascalName}Symbols`]);
  if (/\bPointer\b/.test(blob)) used.add('Pointer');
  if (/\bAnyPointer\b/.test(blob)) used.add('AnyPointer');
  for (const h of tables.handleTypes) {
    if (new RegExp(`\\b${h}\\b`).test(blob)) used.add(h);
  }
  L.push(`import type { ${[...used].sort().join(', ')} } from "./types.ts";`);
  L.push(``);
  L.push(`/**`);
  L.push(` * Object-param surface over the raw symbols — the toolkit convention`);
  L.push(` * (docs/ARCHITECTURE.md). One options object per call; no-arg`);
  L.push(` * functions stay no-arg.`);
  L.push(` */`);
  L.push(`export interface ${pascalName}Functions {`);
  for (const fn of tables.functions) {
    if (fn.args.length === 0) {
      L.push(`  ${fn.name}(): ${fn.returns.ts};`);
      continue;
    }
    const fields = fn.args.map((a) => `${a.name}: ${a.ts}`).join('; ');
    L.push(`  ${fn.name}(opts: { ${fields} }): ${fn.returns.ts};`);
  }
  L.push(`}`);
  L.push(``);
  L.push(
    `export function create${pascalName}Functions(symbols: ${pascalName}Symbols): ${pascalName}Functions {`
  );
  L.push(`  return {`);
  for (const fn of tables.functions) {
    if (fn.args.length === 0) {
      L.push(`    ${fn.name}: () => symbols.${fn.name}(),`);
      continue;
    }
    const positional = fn.args.map((a) => `opts.${a.name}`).join(', ');
    L.push(`    ${fn.name}: (opts) => symbols.${fn.name}(${positional}),`);
  }
  L.push(`  };`);
  L.push(`}`);
  L.push(``);
  return L.join('\n');
}
