/**
 * The codegen pipeline for one target:
 *   clang AST dump → parse → FFI tables → generated files
 *
 * `generateTarget(spec, true)` is the CI byte-stability check;
 * `generateTarget(spec, false)` writes the files.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { dumpAst } from "./ast-dump";
import { ClangNodeParser } from "./clang/parser";
import { scanNumericDefines } from "./defines";
import {
  generateDefs,
  generateFfiConstants,
  generateFunctions,
  generateTypes,
  summarizeUnsafe,
} from "./gen/index.ts";
import { buildFfiTables } from "./model";
import { pascalCase } from "./model";
import { includeDir, type TargetSpec } from "./targets";

const bindingsSrcDir = join(
  import.meta.dir,
  "../../..",
  "packages/bindings/src"
);

export async function generateTarget(
  spec: TargetSpec,
  check: boolean
): Promise<void> {
  const base = includeDir();
  const headerPath = join(base, spec.headerRel);
  console.log(`codegen[${spec.name}]: dumping ${headerPath} …`);

  const ast = dumpAst(headerPath, base);
  // No parser-level name filter: non-prefixed typedefs (Sint32, Uint16, …)
  // must reach the alias resolver; the model filters by prefix instead.
  const header = await new ClangNodeParser(ast).parse();
  const tables = buildFfiTables(header, { namePrefix: spec.prefix });

  const { defines, skipped } = spec.definesSubdir
    ? scanNumericDefines(base, spec.definesSubdir, spec.prefix)
    : { defines: [], skipped: 0 };

  const outDir = join(bindingsSrcDir, "libraries", spec.name, "generated");
  const constants = generateFfiConstants(
    tables,
    spec.origin,
    defines,
    `${pascalCase(spec.name)}Defines`
  );
  const defs = generateDefs(tables, spec.origin, `${spec.name}Defs`);
  const types = generateTypes(tables, pascalCase(spec.name), spec.prefix);
  const functions = generateFunctions(tables, pascalCase(spec.name));

  const outputs: [string, string][] = [
    [join(outDir, "constants.ts"), constants],
    [join(outDir, "defs.ts"), defs],
    [join(outDir, "types.ts"), types],
    [join(outDir, "functions.ts"), functions],
  ];

  if (check) {
    for (const [path, content] of outputs) {
      const current = await Bun.file(path).text();
      if (current !== content) {
        console.error(
          `codegen[${spec.name}]: ${path} is out of date — run \`bun run codegen:all\``
        );
        process.exit(1);
      }
    }
    console.log(`codegen[${spec.name}]: up to date`);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  for (const [path, content] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }

  console.log(
    `codegen[${spec.name}]: ${tables.functions.length} functions, ${tables.enums.length} enums, ${defines.length} defines` +
      (skipped > 0 ? ` (${skipped} non-numeric defines skipped)` : "") +
      summarizeUnsafe(tables)
  );
}
