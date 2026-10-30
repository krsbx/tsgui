/**
 * tsgui codegen — parses real C headers via clang's AST JSON dump and
 * generates FFI backend tables for @tsgui/bindings.
 *
 * Usage:
 *   bun run tools/codegen/src/index.ts sdl          # regenerate SDL3 tables
 *   bun run tools/codegen/src/index.ts sdl --check  # CI: fail if stale
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { ClangNodeParser } from './clang/parser';
import { buildFfiTables, type FfiFilterOptions } from './model';
import { scanNumericDefines } from './defines';
import {
  generateBunDefs,
  generateFfiConstants,
  generateNodeDefs,
  summarizeUnsafe,
} from './gen/ffi';

const repoRoot = join(import.meta.dir, '../../..');
const generatedDir = join(repoRoot, 'packages/bindings/src/generated');

/** Where SDL3 headers live, by platform convention. */
function sdl3IncludeDir(): string {
  if (process.env.TSGUI_SDL3_INCLUDE) return process.env.TSGUI_SDL3_INCLUDE;
  if (process.platform === 'darwin') {
    return '/opt/homebrew/include';
  }
  if (process.platform === 'linux') return '/usr/include';
  throw new Error(
    'codegen: set TSGUI_SDL3_INCLUDE to the directory containing SDL3/'
  );
}

function dumpAst(headerPath: string, includeDir?: string): unknown {
  const args = [
    '-x',
    'c',
    '-fsyntax-only',
    '-Xclang',
    '-ast-dump=json',
    '-fparse-all-comments',
  ];
  if (includeDir) args.push(`-I${includeDir}`);
  args.push(headerPath);

  const res = spawnSync('clang', args, {
    encoding: 'utf8',
    // SDL3's full AST dump is tens of MB — raise the default 1 MB cap.
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (res.error) {
    throw new Error(`clang spawn failed: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(
      `clang ast-dump failed (${res.status}):\n${(res.stderr ?? '').slice(0, 2000)}`
    );
  }
  for (const text of [res.stdout ?? '', res.stderr ?? '']) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }
  }
  throw new Error('clang produced no JSON AST dump on stdout or stderr');
}

/**
 * A Target = one native library bound through FFI. Adding a library means
 * adding one Target factory + one `case` below (and a loader in
 * @tsgui/bindings) — everything under clang/, model, and gen is
 * library-agnostic.
 */
interface Target {
  origin: string;
  headerPath: string;
  includeDir?: string;
  filter: FfiFilterOptions;
  /** Export name of the defs table in the generated files. */
  defsExportName: string;
  /** Output file names, relative to packages/bindings/src/generated. */
  outputs: { constants: string; bunDefs: string; nodeDefs: string };
  /** #define constants live in this subdirectory of includeDir. */
  definesSubdir?: string;
}

function sdlTarget(): Target {
  const includeDir = sdl3IncludeDir();
  return {
    origin: 'SDL3 headers',
    headerPath: join(includeDir, 'SDL3/SDL.h'),
    includeDir,
    filter: { namePrefix: 'SDL_' },
    defsExportName: 'sdlDefs',
    outputs: {
      constants: 'sdl-constants.ts',
      bunDefs: 'sdl-defs-bun.ts',
      nodeDefs: 'sdl-defs-node.ts',
    },
    definesSubdir: 'SDL3',
  };
}

async function generateSdl(check: boolean): Promise<void> {
  const target = sdlTarget();
  console.log(`codegen: dumping ${target.headerPath} …`);

  const ast = dumpAst(target.headerPath, target.includeDir);
  // No parser-level name filter: non-prefixed typedefs (Sint32, Uint16, …)
  // must reach the alias resolver; the model filters by prefix instead.
  const header = await new ClangNodeParser(ast).parse();
  const tables = buildFfiTables(header, target.filter);

  const { defines, skipped } = target.definesSubdir
    ? scanNumericDefines(target.includeDir!, target.definesSubdir, 'SDL_')
    : { defines: [], skipped: 0 };

  const constants = generateFfiConstants(tables, target.origin, defines);
  const bunDefs = generateBunDefs(tables, target.origin, target.defsExportName);
  const nodeDefs = generateNodeDefs(
    tables,
    target.origin,
    target.defsExportName
  );

  const outputs: [string, string][] = [
    [join(generatedDir, target.outputs.constants), constants],
    [join(generatedDir, target.outputs.bunDefs), bunDefs],
    [join(generatedDir, target.outputs.nodeDefs), nodeDefs],
  ];

  if (check) {
    for (const [path, content] of outputs) {
      const current = await Bun.file(path).text();
      if (current !== content) {
        console.error(
          `codegen: ${path} is out of date — run \`bun run codegen sdl\``
        );
        process.exit(1);
      }
    }
    console.log('codegen: generated files are up to date');
    return;
  }

  mkdirSync(generatedDir, { recursive: true });
  for (const [path, content] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }

  console.log(
    `codegen: ${tables.functions.length} functions, ${tables.enums.length} enums, ${defines.length} defines` +
      (skipped > 0 ? ` (${skipped} non-numeric defines skipped)` : '') +
      summarizeUnsafe(tables) +
      `\n→ ${generatedDir}`
  );
}

async function main() {
  const check = process.argv.includes('--check');
  const targetName = process.argv[2];

  switch (targetName) {
    case 'sdl':
      await generateSdl(check);
      break;
    default:
      console.error('usage: codegen <sdl> [--check]');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
