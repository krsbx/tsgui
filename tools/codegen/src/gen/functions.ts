/**
 * Generator for the single-object-param wrapper surface
 * (`<Lib>Functions` + the `create<Lib>Functions()` factory).
 */
import type { FfiTables } from "../model";
import { banner } from "./shared";

export function generateFunctions(
  tables: FfiTables,
  pascalName: string
): string {
  const L = banner(`single-object-param wrappers for ${pascalName}`);
  // types.ts re-exports core brands for satellite libraries, so a single
  // local import covers Symbols, brands, and buffer types.
  const blob = tables.functions
    .map((f) => [f.returns.ts, ...f.args.map((a) => a.ts)].join("\n"))
    .join("\n");
  const used = new Set<string>([`${pascalName}Symbols`]);
  if (/\bPointer\b/.test(blob)) used.add("Pointer");
  if (/\bAnyPointer\b/.test(blob)) used.add("AnyPointer");
  for (const h of tables.handleTypes) {
    if (new RegExp(`\\b${h}\\b`).test(blob)) used.add(h);
  }
  L.push(`import type { ${[...used].sort().join(", ")} } from "./types.ts";`);
  L.push(``);
  L.push(`/**`);
  L.push(
    ` * Object-param surface over the raw symbols — the toolkit convention`
  );
  L.push(` * (docs/ARCHITECTURE.md). One options object per call; no-arg`);
  L.push(` * functions stay no-arg.`);
  L.push(` */`);
  L.push(`export interface ${pascalName}Functions {`);
  for (const fn of tables.functions) {
    if (fn.args.length === 0) {
      L.push(`  ${fn.name}(): ${fn.returns.ts};`);
      continue;
    }
    const fields = fn.args.map((a) => `${a.name}: ${a.ts}`).join("; ");
    L.push(`  ${fn.name}(opts: { ${fields} }): ${fn.returns.ts};`);
  }
  L.push(`}`);
  L.push(``);
  L.push(`/**`);
  L.push(` * Structural "Like" surface over ${pascalName}Symbols (or an extended`);
  L.push(` * symbols type S): every symbol must exist and take no more params`);
  L.push(` * than declared, but argument and return types stay open — so raw`);
  L.push(` * dlopen symbols from either backend (bun:ffi / node:ffi) fit without`);
  L.push(` * a cast.`);
  L.push(` */`);
  L.push(
    `export type ${pascalName}SymbolsLike<S extends ${pascalName}Symbols = ${pascalName}Symbols> = {`
  );
  L.push(`  [K in keyof S]: S[K] extends (...args: infer A) => any`);
  L.push(`    ? (...args: { [I in keyof A]: any }) => unknown`);
  L.push(`    : S[K];`);
  L.push(`};`);
  L.push(``);
  L.push(`/**`);
  L.push(` * Checked brand: view raw backend symbols as the branded S surface.`);
  L.push(` * Symbol keys are compile-checked; handle types are trusted.`);
  L.push(` */`);
  L.push(
    `export function as${pascalName}Symbols<S extends ${pascalName}Symbols = ${pascalName}Symbols>(symbols: ${pascalName}SymbolsLike<NoInfer<S>>): S {`
  );
  L.push(`  return symbols as unknown as S;`);
  L.push(`}`);
  L.push(``);
  L.push(
    `export function create${pascalName}Functions(symbols: ${pascalName}SymbolsLike): ${pascalName}Functions;`
  );
  L.push(
    `export function create${pascalName}Functions<S extends ${pascalName}Symbols, U extends object>(symbols: ${pascalName}SymbolsLike<NoInfer<S>>, extension: (symbols: S) => U): ${pascalName}Functions & U;`
  );
  L.push(
    `export function create${pascalName}Functions<U extends object>(symbols: ${pascalName}SymbolsLike, extension: U extends Function ? never : U): ${pascalName}Functions & U;`
  );
  L.push(
    `export function create${pascalName}Functions(raw: ${pascalName}SymbolsLike, extension?: object | ((symbols: ${pascalName}Symbols) => object)): ${pascalName}Functions {`
  );
  L.push(`  const symbols = as${pascalName}Symbols(raw);`);
  L.push(`  const res = {`);
  for (const fn of tables.functions) {
    if (fn.args.length === 0) {
      L.push(`    ${fn.name}: () => symbols.${fn.name}(),`);
      continue;
    }
    const positional = fn.args.map((a) => `opts.${a.name}`).join(", ");
    L.push(`    ${fn.name}: (opts) => symbols.${fn.name}(${positional}),`);
  }
  L.push(`  } satisfies ${pascalName}Functions;`);
  L.push(
    `  return extension ? Object.assign(res, typeof extension === 'function' ? extension(symbols) : extension) : res;`
  );
  L.push(`}`);
  L.push(``);
  return L.join("\n");
}
