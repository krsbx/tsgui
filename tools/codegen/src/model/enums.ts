/** Two-pass enum-constant collection and alias resolution. */
import type { CEnumDecl, CHeaderDecl, CTypedefDecl } from "../clang/types.ts";
import { DeclarationKind } from "../clang/types.ts";
import type { FfiEnum, FfiFilterOptions } from "./interfaces.ts";
import { pascalCase, stripPrefix } from "./names.ts";

/**
 * Two-pass enum-constant resolution: aliases of other constants
 * (DeclRefExpr) are resolved against everything parsed before them;
 * unresolved ones are dropped and reported. Anonymous enums are named by
 * the `typedef enum {…} Name;` that follows them.
 */
export function collectEnums(
  header: CHeaderDecl,
  opts: FfiFilterOptions
): { enums: FfiEnum[]; unresolved: string[] } {
  const enums: FfiEnum[] = [];
  const unresolved: string[] = [];
  const known = new Map<string, number>();
  let pendingAnonymous: {
    constants: { name: string; value: number }[];
  } | null = null;

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
      if (t.tag === "enum" && pendingAnonymous) {
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
