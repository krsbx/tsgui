/**
 * Clang AST JSON → normalized declaration tree.
 * Ported from flying-pan (src/ffi/parser/index.ts).
 *
 * No name/source filtering happens here — the full dump is parsed and the
 * model filters by symbol prefix. Non-prefixed typedefs (Sint32, Uint16, …)
 * must survive parsing so the model's alias resolver can see them.
 */
import { basename } from "node:path";
import {
  parseEnumDecl,
  parseFunctionDecl,
  parseRecordDecl,
  parseTypedefDecl,
  parseVarDecl,
} from "./parsers";
import type { CASTNode, CHeaderDecl, ClangNode } from "./types";
import { CDeclarationKind, DeclarationKind } from "./types";

export class ClangNodeParser {
  public readonly path: string | null;
  public readonly json: unknown | null;

  public constructor(path: string);
  public constructor(json: unknown);
  public constructor(args: string | unknown) {
    this.path = typeof args === "string" ? args : null;
    this.json = typeof args === "object" ? args : null;
  }

  public async parse(): Promise<CHeaderDecl> {
    const root: ClangNode | null = this.path
      ? await Bun.file(this.path).json()
      : (this.json as ClangNode | null);
    const declarations: CASTNode[] = [];

    for (const node of root?.inner ?? []) {
      if (node.isImplicit) continue;
      if (!node.loc?.line) continue;
      if (node.inline) continue;
      if (node.storageClass === "static") continue;

      const decl = ClangNodeParser.parseNode(node);
      if (decl) declarations.push(decl);
    }

    return {
      filename: this.path ? basename(this.path) : "",
      kind: DeclarationKind.HEADER,
      declarations,
    };
  }

  private static parseNode(node: ClangNode) {
    switch (node.kind) {
      case CDeclarationKind.FUNCTION_DECL:
        return parseFunctionDecl(node);
      case CDeclarationKind.TYPEDEF_DECL:
        return parseTypedefDecl(node);
      case CDeclarationKind.RECORD_DECL:
        return parseRecordDecl(node);
      case CDeclarationKind.ENUM_DECL:
        return parseEnumDecl(node);
      case CDeclarationKind.VAR_DECL:
        return parseVarDecl(node);
      default:
        return null;
    }
  }
}
