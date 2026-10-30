/**
 * tsgui codegen — parses real C headers via clang's AST JSON dump and
 * generates FFI backend tables for @tsgui/bindings.
 *
 * Usage:
 *   bun run tools/codegen/src/index.ts <target>|all [--check]
 *
 * Targets are declared in TARGETS below; the pipeline itself is generic.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { ClangNodeParser } from './clang/parser';
import { buildFfiTables } from './model';
import { scanNumericDefines } from './defines';
import {
  generateBunDefs,
  generateFfiConstants,
  generateNodeDefs,
  generateTypesAndFunctions,
  summarizeUnsafe,
} from './gen/ffi';
import { pascalCase } from './model';

const repoRoot = join(import.meta.dir, '../../..');
const bindingsSrcDir = join(repoRoot, 'packages/bindings/src');

/** Base include dir that exposes SDL3*/ function includeDir(): string {
  if (process.env.TSGUI_SDL3_INCLUDE) return process.env.TSGUI_SDL3_INCLUDE;
  if (process.platform === 'darwin') return '/opt/homebrew/include';
  if (process.platform === 'linux') return '/usr/include';
  throw new Error(
    'codegen: set TSGUI_SDL3_INCLUDE to the base include directory (contains SDL3/, SDL3_image/, …)'
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

interface TargetSpec {
  /** Library short name: file prefix, output folder, defs export name. */
  name: string;
  origin: string;
  /** Header path relative to the base include dir. */
  headerRel: string;
  prefix: string;
  /** Subdirectory of the include dir to scan for numeric #defines. */
  definesSubdir?: string;
}

const TARGETS: Record<string, TargetSpec> = {
  sdl: {
    name: 'sdl',
    origin: 'SDL3 headers',
    headerRel: 'SDL3/SDL.h',
    prefix: 'SDL_',
    definesSubdir: 'SDL3',
  },
  image: {
    name: 'image',
    origin: 'SDL3_image headers',
    headerRel: 'SDL3_image/SDL_image.h',
    prefix: 'IMG_',
    definesSubdir: 'SDL3_image',
  },
  ttf: {
    name: 'ttf',
    origin: 'SDL3_ttf headers',
    headerRel: 'SDL3_ttf/SDL_ttf.h',
    prefix: 'TTF_',
    definesSubdir: 'SDL3_ttf',
  },
  mixer: {
    name: 'mixer',
    origin: 'SDL3_mixer headers',
    headerRel: 'SDL3_mixer/SDL_mixer.h',
    prefix: 'MIX_',
    definesSubdir: 'SDL3_mixer',
  },
};

async function generateTarget(spec: TargetSpec, check: boolean): Promise<void> {
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

  const outDir = join(bindingsSrcDir, 'libraries', spec.name, 'generated');
  const constants = generateFfiConstants(
    tables,
    spec.origin,
    defines,
    `${pascalCase(spec.name)}Defines`
  );
  const bunDefs = generateBunDefs(tables, spec.origin, `${spec.name}Defs`);
  const nodeDefs = generateNodeDefs(tables, spec.origin, `${spec.name}Defs`);
  const { types, functions } = generateTypesAndFunctions(
    tables,
    pascalCase(spec.name),
    spec.prefix
  );

  const outputs: [string, string][] = [
    [join(outDir, 'constants.ts'), constants],
    [join(outDir, 'defs-bun.ts'), bunDefs],
    [join(outDir, 'defs-node.ts'), nodeDefs],
    [join(outDir, 'types.ts'), types],
    [join(outDir, 'functions.ts'), functions],
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
      (skipped > 0 ? ` (${skipped} non-numeric defines skipped)` : '') +
      summarizeUnsafe(tables)
  );
}

async function main() {
  const check = process.argv.includes('--check');
  const targetName = process.argv[2];

  if (targetName === 'all') {
    for (const spec of Object.values(TARGETS)) {
      await generateTarget(spec, check);
    }
    return;
  }

  const spec = targetName ? TARGETS[targetName] : undefined;
  if (!spec) {
    console.error(`usage: codegen <${Object.keys(TARGETS).join('|')}|all> [--check]`);
    process.exit(1);
  }
  await generateTarget(spec, check);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
