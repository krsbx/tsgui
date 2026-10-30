/**
 * Semantic model of an FFI surface, derived from parsed Clang AST dumps.
 *
 * `buildFfiTables` is the single consumer: it produces the dlopen tables
 * for both backends (bun:ffi / node:ffi). Functions that are not
 * FFI-safe (struct-by-value, callbacks, variadics) are filtered and
 * reported, never silently dropped.
 *
 * If a compiled addon (N-API) is ever wanted again, write a generator
 * against these parsed types — do not resurrect the old hand-classified
 * object-bridge model (see docs/FFI.md historical notes).
 */
import type {
  CEnumDecl,
  CFunctionDecl,
  CHeaderDecl,
  CTypedefDecl,
  CTypeDecl,
} from './clang/types';
import { DeclarationKind } from './clang/types';

export function camelize(s: string): string {
  return s.replace(/_+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function pascalCase(s: string): string {
  const c = camelize(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** Strip the target's symbol prefix from a declaration name ("SDL_Foo" → "Foo"). */
function stripPrefix(name: string, prefix: string): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return name.replace(new RegExp(`^${escaped}`), '');
}

/* ------------------------------------------------------------------ */
/* FFI tables                                                          */
/* ------------------------------------------------------------------ */

/** Normalized C argument/return kinds, backend-mappable. */
export type FfiType =
  | 'void'
  | 'bool'
  | 'i8'
  | 'u8'
  | 'i16'
  | 'u16'
  | 'i32'
  | 'u32'
  | 'i64'
  | 'u64'
  | 'f32'
  | 'f64'
  | 'string' // const char*
  | 'pointer'; // everything else through a pointer

const PRIMITIVES: Record<string, FfiType> = {
  void: 'void',
  bool: 'bool',
  _Bool: 'bool',
  char: 'i8',
  'signed char': 'i8',
  'unsigned char': 'u8',
  short: 'i16',
  'unsigned short': 'u16',
  int: 'i32',
  'unsigned int': 'u32',
  long: 'i64',
  'unsigned long': 'u64',
  'long long': 'i64',
  'unsigned long long': 'u64',
  int8_t: 'i8',
  uint8_t: 'u8',
  int16_t: 'i16',
  uint16_t: 'u16',
  int32_t: 'i32',
  uint32_t: 'u32',
  int64_t: 'i64',
  uint64_t: 'u64',
  size_t: 'u64',
  intptr_t: 'i64',
  uintptr_t: 'u64',
  float: 'f32',
  double: 'f64',
};

function classifyFfiType(
  t0: CTypeDecl,
  aliases: Map<string, CTypeDecl>,
  enumNames: Set<string>
): FfiType | null {
  // clang drops desugaredQualType on function types, so SDL typedef names
  // (Uint16, Sint32, …) survive into returnType — resolve through the
  // header's own typedefs, with a cycle guard.
  let t = t0;
  for (let i = 0; aliases.has(t.name) && i < 8; i++) {
    t = aliases.get(t.name)!;
  }

  // Enums by value are machine ints.
  if (t.pointerDepth === 0 && enumNames.has(t.name)) return 'i32';

  if (t.isFunctionPointer) return null;
  if (t.pointerDepth === 0) {
    return PRIMITIVES[t.name] ?? null; // null = struct/union by value
  }
  // Depth >= 1: pointers. const char* is a string; everything else is raw.
  if (t.name === 'char' && t.isConst) return 'string';
  return 'pointer';
}

export interface FfiFunction {
  name: string;
  returns: FfiType;
  args: FfiType[];
}

export interface UnsafeFunction {
  name: string;
  reason: string;
}

export interface FfiEnum {
  cName: string;
  tsName: string;
  constants: { name: string; value: number }[];
}

export interface FfiTables {
  functions: FfiFunction[];
  unsafe: UnsafeFunction[];
  enums: FfiEnum[];
}

export interface FfiFilterOptions {
  /** Only functions whose names start with this prefix (e.g. "SDL_"). */
  namePrefix: string;
}

/**
 * Two-pass enum-constant resolution: aliases of other constants
 * (DeclRefExpr) are resolved against everything parsed before them;
 * unresolved ones are dropped and reported. Anonymous enums are named by
 * the `typedef enum {…} Name;` that follows them.
 */
function collectEnums(
  header: CHeaderDecl,
  opts: FfiFilterOptions
): { enums: FfiEnum[]; unresolved: string[] } {
  const enums: FfiEnum[] = [];
  const unresolved: string[] = [];
  const known = new Map<string, number>();
  let pendingAnonymous: { constants: { name: string; value: number }[] } | null =
    null;

  for (const decl of header.declarations) {
    if (decl.kind === DeclarationKind.ENUM) {
      const e = decl as CEnumDecl;
      const inSource = e.constants.some((c) =>
        c.name.startsWith(opts.namePrefix)
      );
      if (!inSource || e.constants.length === 0) continue;

      const constants: { name: string; value: number }[] = [];
      for (const c of e.constants) {
        if (!c.valueKnown) {
          const resolved = known.get(c.name);
          if (resolved === undefined) {
            unresolved.push(c.name);
            continue;
          }
          constants.push({ name: c.name, value: resolved });
          continue;
        }
        constants.push({ name: c.name, value: c.value });
        known.set(c.name, c.value);
      }

      if (e.name) {
        enums.push({
          cName: e.name,
          tsName: pascalCase(stripPrefix(e.name, opts.namePrefix)),
          constants,
        });
        pendingAnonymous = null;
      } else {
        pendingAnonymous = { constants };
      }
      continue;
    }

    if (decl.kind === DeclarationKind.TYPEDEF) {
      const t = decl as CTypedefDecl;
      if (t.tag === 'enum' && pendingAnonymous) {
        enums.push({
          cName: t.name,
          tsName: pascalCase(stripPrefix(t.name, opts.namePrefix)),
          constants: pendingAnonymous.constants,
        });
        pendingAnonymous = null;
      }
    }
  }

  return { enums, unresolved };
}

export function buildFfiTables(
  header: CHeaderDecl,
  opts: FfiFilterOptions
): FfiTables {
  const functions: FfiFunction[] = [];
  const unsafe: UnsafeFunction[] = [];

  // Pass 1: typedef aliases + enum type names for resolution.
  const aliases = new Map<string, CTypeDecl>();
  const enumNames = new Set<string>();
  for (const decl of header.declarations) {
    if (decl.kind === DeclarationKind.TYPEDEF) {
      const t = decl as CTypedefDecl;
      if (t.tag === null && !('params' in t.underlyingType)) {
        aliases.set(t.name, t.underlyingType as CTypeDecl);
      }
    } else if (decl.kind === DeclarationKind.ENUM) {
      const e = decl as CEnumDecl;
      if (e.name) enumNames.add(e.name);
    }
  }

  // Pass 2: functions.
  for (const decl of header.declarations) {
    if (decl.kind !== DeclarationKind.FUNCTION) continue;
    const fn = decl as CFunctionDecl;
    if (!fn.name.startsWith(opts.namePrefix)) continue;

    if (fn.variadic) {
      unsafe.push({ name: fn.name, reason: 'variadic' });
      continue;
    }

    const returns = classifyFfiType(fn.returnType, aliases, enumNames);
    if (returns === null) {
      unsafe.push({
        name: fn.name,
        reason: `returns "${fn.returnType.name}" by value`,
      });
      continue;
    }

    let ok = true;
    const args: FfiType[] = [];
    for (const p of fn.params) {
      const kind = classifyFfiType(p.type, aliases, enumNames);
      if (kind === null) {
        unsafe.push({
          name: fn.name,
          reason: `param "${p.name}" is "${p.type.name}" by value`,
        });
        ok = false;
        break;
      }
      args.push(kind);
    }
    if (!ok) continue;

    functions.push({ name: fn.name, returns, args });
  }

  const { enums, unresolved } = collectEnums(header, opts);
  for (const name of unresolved) {
    unsafe.push({ name, reason: 'enum constant references an unknown symbol' });
  }

  return { functions, unsafe, enums };
}
