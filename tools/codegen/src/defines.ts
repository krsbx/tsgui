/**
 * Numeric #define scanner.
 *
 * `#define` macros never appear in the clang AST (flying-pan needed a
 * hand-maintained .macros file for the same reason) — but most SDL flag
 * and button constants live there. We scan the headers textually and keep
 * only macros whose value parses as a plain integer or float literal, an
 * SDL_UINT64_C(…) wrapper, a simple shift of an integer, or a known C
 * standard macro (FLT_EPSILON).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface DefineConstant {
  name: string;
  value: number;
  /** The header wrote it as a hex literal — emit it back as hex. */
  hex: boolean;
}

type Parsed = Pick<DefineConstant, "value" | "hex">;

/** C standard-library macros SDL aliases (SDL_FLT_EPSILON → FLT_EPSILON). */
const C_MACROS: Record<string, number> = {
  FLT_EPSILON: 2 ** -23,
  DBL_EPSILON: Number.EPSILON,
};

function parseValue(raw: string): Parsed | null {
  let v = raw
    .trim()
    .replace(/\/\*.*?\*\//g, "")
    .trim();
  // SDL_UINT64_C(0x20) / SDL_UINT64_C(20) wrappers
  const wrapped = v.match(/^SDL_U?INT(?:64|32)_C\((.+)\)$/);
  if (wrapped) v = wrapped[1]!.trim();

  v = v.replace(/[()]/g, "").trim();

  // Simple shifts: (1u << 30) or 0x1 << 4. Multiply rather than `<<`,
  // which is signed 32-bit and would turn bit 31 negative.
  const shift = v.match(/^(\S+)\s*<<\s*(\d+)$/);
  if (shift) {
    const base = parseInteger(shift[1]!);
    if (base === null) return null;
    return { ...base, value: base.value * 2 ** parseInt(shift[2]!, 10) };
  }

  if (v in C_MACROS) return { value: C_MACROS[v]!, hex: false };
  return parseInteger(v) ?? parseFloatLiteral(v);
}

/** Whole-token C integer literal (decimal/hex, optional u/l suffixes). */
function parseInteger(s: string): Parsed | null {
  const m = s.match(/^(-?)(0x[0-9a-f]+|\d+)[ul]*$/i);
  if (!m) return null;
  const n = Number(m[2]);
  return { value: m[1] ? -n : n, hex: /^0x/i.test(m[2]!) };
}

/** Whole-token C float literal (needs a `.` or exponent; optional f/l suffix). */
function parseFloatLiteral(s: string): Parsed | null {
  const m = s.match(/^-?(?:\d+\.\d*|\.\d+|\d+(?=e))(?:e[+-]?\d+)?[fl]?$/i);
  if (!m) return null;
  return { value: Number(s.replace(/[fl]$/i, "")), hex: false };
}

export function scanNumericDefines(
  includeDir: string,
  subdir: string,
  namePrefixes: string[]
): { defines: DefineConstant[]; skipped: number } {
  const dir = join(includeDir, subdir);
  const defines: DefineConstant[] = [];
  let skipped = 0;

  const seen = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".h")) continue;
    const src = readFileSync(join(dir, file), "utf8");
    const re = /^\s*#define\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const name = m[1]!;
      if (!namePrefixes.some((p) => name.startsWith(p)) || seen.has(name))
        continue;
      const parsed = parseValue(m[2]!);
      if (parsed === null) {
        skipped++;
        continue;
      }
      seen.add(name);
      defines.push({ name, ...parsed });
    }
  }

  defines.sort((a, b) => a.name.localeCompare(b.name));
  return { defines, skipped };
}
