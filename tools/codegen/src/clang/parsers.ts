/**
 * Per-declaration-kind parsers.
 * Ported from flying-pan (src/ffi/parser/parser/*.ts), merged into one file.
 */
import {
  CDeclarationKind,
  type CDeclarationTag,
  type CEnumConstant,
  type CEnumDecl,
  type CFunctionDecl,
  type CFunctionPointerDecl,
  type ClangNode,
  type CStructDecl,
  type CStructField,
  type CTypedefDecl,
  type CUnionDecl,
  type CVarDecl,
  DeclarationKind,
} from "./types.ts";
import {
  extractDoc,
  extractNodeLocation,
  isFunctionPointerType,
  parseCTypeDeclFromString,
  parseFunctionPointerParams,
  parseParams,
  parseReturnTypeFromQualType,
} from "./utility.ts";

export function parseFunctionDecl(node: ClangNode): CFunctionDecl | null {
  if (!node.name) return null;

  const qualType = node.type?.desugaredQualType ?? node.type?.qualType ?? "";
  const returnType = parseReturnTypeFromQualType(qualType);
  const params = parseParams(node.inner ?? []);
  const loc = extractNodeLocation(node);
  const doc = extractDoc(node.inner);

  return {
    kind: DeclarationKind.FUNCTION,
    name: node.name,
    returnType,
    params,
    variadic: node.variadic ?? false,
    loc,
    doc,
  };
}

type ParsedEnumValue =
  { type: "value"; value: number } | { type: "alias" } | { type: "implicit" };

const COMMENT_KINDS = new Set<(string & {}) | CDeclarationKind>([
  CDeclarationKind.FULL_COMMENT,
  CDeclarationKind.PARAGRAPH_COMMENT,
  CDeclarationKind.TEXT_COMMENT,
]);

function findLiteralValue(node: ClangNode): number | null {
  if (node.kind === CDeclarationKind.INTEGER_LITERAL) {
    return parseInt(node.value ?? "0", 10);
  }
  if (node.kind === CDeclarationKind.UNARY_OPERATOR) {
    const operand = node.inner?.find((c) => !COMMENT_KINDS.has(c.kind));
    const v = operand ? findLiteralValue(operand) : null;
    return v === null ? null : -v;
  }
  // ConstantExpr / ImplicitCastExpr / ParenExpr wrap the real literal.
  if (node.value != null && node.kind === "ConstantExpr") {
    return parseInt(node.value, 10);
  }
  for (const child of node.inner ?? []) {
    if (COMMENT_KINDS.has(child.kind)) continue;
    const v = findLiteralValue(child);
    if (v !== null) return v;
  }
  return null;
}

function parseEnumValue(node: ClangNode): ParsedEnumValue {
  if (!node.inner) return { type: "implicit" };

  for (const child of node.inner) {
    if (COMMENT_KINDS.has(child.kind)) continue;
    if (child.kind === CDeclarationKind.DECL_REF_EXPR) return { type: "alias" };
    const v = findLiteralValue(child);
    if (v !== null) return { type: "value", value: v };
  }

  // No value expression: the compiler assigns the previous constant + 1.
  return { type: "implicit" };
}

export function parseEnumDecl(node: ClangNode): CEnumDecl {
  const name = node.name || "";
  const isOpaque = !node.completeDefinition;
  const loc = extractNodeLocation(node);
  const constants: CEnumConstant[] = [];

  if (node.inner) {
    let running = -1;
    for (const child of node.inner) {
      if (child.kind !== CDeclarationKind.ENUM_CONSTANT_DECL || !child.name)
        continue;
      const parsed = parseEnumValue(child);
      if (parsed.type === "value") {
        running = parsed.value;
        constants.push({
          name: child.name,
          value: parsed.value,
          valueKnown: true,
        });
      } else if (parsed.type === "implicit") {
        running += 1;
        constants.push({ name: child.name, value: running, valueKnown: true });
      } else {
        constants.push({ name: child.name, value: 0, valueKnown: false });
      }
    }
  }

  return {
    kind: DeclarationKind.ENUM,
    name,
    constants,
    isOpaque,
    loc,
    doc: null,
  };
}

export function parseRecordDecl(
  node: ClangNode
): CStructDecl | CUnionDecl | null {
  if (!node.name) return null;

  const isOpaque = !node.completeDefinition;
  const loc = extractNodeLocation(node);
  const doc = extractDoc(node.inner);
  const fields: CStructField[] = [];

  if (node.inner) {
    for (const child of node.inner) {
      if (child.kind === CDeclarationKind.FIELD_DECL && child.name) {
        const type = parseCTypeDeclFromString(
          child.type?.desugaredQualType ?? child.type?.qualType ?? ""
        );
        fields.push({
          type,
          name: child.name,
          bitWidth: child.isBitField ? (child.bitWidth ?? 0) : null,
        });
      }
    }
  }

  const kind =
    node.tagUsed === "union" ? DeclarationKind.UNION : DeclarationKind.STRUCT;

  return { kind, name: node.name, fields, isOpaque, loc, doc };
}

function parseFunctionPointerTypedef(
  node: ClangNode,
  qualType: string
): CFunctionPointerDecl | null {
  if (!node.name) return null;

  const ptrMatch = qualType.match(/^(.+?)\s*\(\*/);
  if (!ptrMatch) return null;

  return {
    kind: DeclarationKind.FUNCTION_POINTER,
    name: node.name,
    returnType: parseCTypeDeclFromString(ptrMatch[1]!.trim()),
    params: parseFunctionPointerParams(qualType),
    loc: extractNodeLocation(node),
    doc: null,
  };
}

export function parseTypedefDecl(
  node: ClangNode
): CTypedefDecl | CFunctionPointerDecl | null {
  if (!node.name) return null;

  const rawQualType = node.type?.qualType ?? "";
  const qualType = node.type?.desugaredQualType ?? rawQualType;
  const loc = extractNodeLocation(node);

  if (isFunctionPointerType(qualType)) {
    return parseFunctionPointerTypedef(node, qualType);
  }

  let tag: CDeclarationTag | null = null;
  const tagMatch = rawQualType.match(/^(enum|struct|union)\s+/);
  const tagValue = tagMatch?.[1];
  if (tagValue === "enum" || tagValue === "struct" || tagValue === "union") {
    tag = tagValue;
  }

  return {
    kind: DeclarationKind.TYPEDEF,
    name: node.name,
    underlyingType: parseCTypeDeclFromString(qualType),
    tag,
    loc,
    doc: null,
  };
}

export function parseVarDecl(node: ClangNode): CVarDecl | null {
  if (!node.name) return null;
  return {
    kind: DeclarationKind.VAR,
    name: node.name,
    type: parseCTypeDeclFromString(
      node.type?.desugaredQualType ?? node.type?.qualType ?? ""
    ),
    loc: extractNodeLocation(node),
    doc: null,
  };
}
