/** `buildFfiTables` — the entry point that assembles the FFI model. */
import type {
  CEnumDecl,
  CFunctionDecl,
  CHeaderDecl,
  CStructDecl,
  CTypedefDecl,
  CTypeDecl,
} from '../clang/types';
import { DeclarationKind } from '../clang/types';
import { classifyFfiType, scalarTs } from './kinds';
import { classifyPointerTs } from './pointers';
import { collectEnums } from './enums';
import type {
  FfiArg,
  FfiFilterOptions,
  FfiFunction,
  FfiTables,
  UnsafeFunction,
} from './interfaces';

const JS_RESERVED = new Set([
  'arguments', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
  'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield',
]);

function jsSafeName(name: string): string {
  return JS_RESERVED.has(name) ? `_${name}` : name;
}

export function buildFfiTables(
  header: CHeaderDecl,
  opts: FfiFilterOptions
): FfiTables {
  const functions: FfiFunction[] = [];
  const unsafe: UnsafeFunction[] = [];
  const handleTypes = new Set<string>();

  // Pass 1: typedef aliases, enum names, complete record (struct/union)
  // names — the C opacity rule: a record with a complete definition is
  // memory the caller constructs; an incomplete one is an opaque handle.
  const aliases = new Map<string, CTypeDecl>();
  const enumNames = new Set<string>();
  const completeRecords = new Set<string>();
  let pendingAnonymousRecord = false;
  for (const decl of header.declarations) {
    if (decl.kind === DeclarationKind.TYPEDEF) {
      const t = decl as CTypedefDecl;
      if (t.tag === null && !('params' in t.underlyingType)) {
        aliases.set(t.name, t.underlyingType as CTypeDecl);
      } else if (pendingAnonymousRecord && (t.tag === 'struct' || t.tag === 'union')) {
        completeRecords.add(t.name);
        pendingAnonymousRecord = false;
      }
    } else if (decl.kind === DeclarationKind.ENUM) {
      const e = decl as CEnumDecl;
      if (e.name) enumNames.add(e.name);
    } else if (
      decl.kind === DeclarationKind.STRUCT ||
      decl.kind === DeclarationKind.UNION
    ) {
      const r = decl as CStructDecl;
      if (r.name) {
        if (!r.isOpaque) completeRecords.add(r.name);
      } else if (!r.isOpaque) {
        pendingAnonymousRecord = true;
      }
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

    const returnKind = classifyFfiType(fn.returnType, aliases, enumNames);
    if (returnKind === null) {
      unsafe.push({
        name: fn.name,
        reason: `returns "${fn.returnType.name}" by value`,
      });
      continue;
    }
    const returnTs =
      returnKind === 'pointer'
        ? classifyPointerTs(
            fn.returnType,
            aliases,
            enumNames,
            completeRecords,
            handleTypes
          )
        : scalarTs(returnKind, 'return');
    if (returnTs === null) {
      unsafe.push({
        name: fn.name,
        reason: `returns a function pointer`,
      });
      continue;
    }

    let ok = true;
    const args: FfiArg[] = [];
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
      const ts =
        kind === 'pointer'
          ? classifyPointerTs(
              p.type,
              aliases,
              enumNames,
              completeRecords,
              handleTypes
            )
          : scalarTs(kind, 'param');
      if (ts === null) {
        unsafe.push({
          name: fn.name,
          reason: `param "${p.name}" is a function pointer`,
        });
        ok = false;
        break;
      }
      args.push({ name: jsSafeName(p.name), kind, ts });
    }
    if (!ok) continue;

    functions.push({
      name: fn.name,
      returns: { kind: returnKind, ts: returnTs },
      args,
    });
  }

  const { enums, unresolved } = collectEnums(header, opts);
  for (const name of unresolved) {
    unsafe.push({ name, reason: 'enum constant references an unknown symbol' });
  }

  return { functions, unsafe, enums, handleTypes: [...handleTypes].sort() };
}
