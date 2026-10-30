/**
 * Numeric #define scanner.
 *
 * `#define` macros never appear in the clang AST (flying-pan needed a
 * hand-maintained .macros file for the same reason) — but most SDL flag
 * and button constants live there. We scan the headers textually and keep
 * only macros whose value parses as a plain integer, an SDL_UINT64_C(…)
 * wrapper, or a simple shift of one.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DefineConstant {
  name: string;
  value: number;
}

function parseValue(raw: string): number | null {
  let v = raw.trim().replace(/\/\*.*?\*\//g, '').trim();
  // SDL_UINT64_C(0x20) / SDL_UINT64_C(20) wrappers
  const wrapped = v.match(/^SDL_U?INT(?:64|32)_C\((.+)\)$/);
  if (wrapped) v = wrapped[1]!.trim();

  // Simple shifts: (0x1 << 4) or 0x1 << 4
  const shift = v.match(/^(.+?)\s*(?:<<)\s*(\d+)$/);
  if (shift) {
    const base = parseInt(shift[1]!.replace(/[()]/g, '').trim());
    if (Number.isNaN(base)) return null;
    return base << parseInt(shift[2]!, 10);
  }

  const n = parseInt(v.replace(/[()]/g, '').trim());
  return Number.isNaN(n) ? null : n;
}

export function scanNumericDefines(
  includeDir: string,
  subdir: string,
  namePrefix: string
): { defines: DefineConstant[]; skipped: number } {
  const dir = join(includeDir, subdir);
  const defines: DefineConstant[] = [];
  let skipped = 0;

  const seen = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.h')) continue;
    const src = readFileSync(join(dir, file), 'utf8');
    const re = /^\s*#define\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const name = m[1]!;
      if (!name.startsWith(namePrefix) || seen.has(name)) continue;
      const value = parseValue(m[2]!);
      if (value === null) {
        skipped++;
        continue;
      }
      seen.add(name);
      defines.push({ name, value });
    }
  }

  defines.sort((a, b) => a.name.localeCompare(b.name));
  return { defines, skipped };
}
