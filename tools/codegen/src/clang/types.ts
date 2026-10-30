/**
 * Raw Clang AST JSON shapes + the normalized declaration model.
 *
 * Ported from flying-pan (src/ffi/ast) — kept close to the original so the
 * two codebases stay conceptually aligned.
 */

export const CDeclarationKind = {
  FUNCTION_DECL: 'FunctionDecl',
  TYPEDEF_DECL: 'TypedefDecl',
  RECORD_DECL: 'RecordDecl',
  ENUM_DECL: 'EnumDecl',
  VAR_DECL: 'VarDecl',
  FULL_COMMENT: 'FullComment',
  TEXT_COMMENT: 'TextComment',
  PARAGRAPH_COMMENT: 'ParagraphComment',
  INTEGER_LITERAL: 'IntegerLiteral',
  UNARY_OPERATOR: 'UnaryOperator',
  DECL_REF_EXPR: 'DeclRefExpr',
  ENUM_CONSTANT_DECL: 'EnumConstantDecl',
  FIELD_DECL: 'FieldDecl',
  PARM_VAL_DECL: 'ParmVarDecl',
} as const;

export type CDeclarationKind =
  (typeof CDeclarationKind)[keyof typeof CDeclarationKind];

export const DeclarationKind = {
  FUNCTION: 'FUNCTION',
  STRUCT: 'STRUCT',
  UNION: 'UNION',
  FUNCTION_POINTER: 'FUNCTION_POINTER',
  TYPEDEF: 'TYPEDEF',
  ENUM: 'ENUM',
  VAR: 'VAR',
  HEADER: 'HEADER',
} as const;

export type DeclarationKind =
  (typeof DeclarationKind)[keyof typeof DeclarationKind];

export const CDeclarationTag = {
  ENUM: 'enum',
  STRUCT: 'struct',
  UNION: 'union',
} as const;

export type CDeclarationTag =
  (typeof CDeclarationTag)[keyof typeof CDeclarationTag];

export interface ClangLoc {
  offset: number | null;
  line: number | null;
  col: number | null;
  tokLen: number | null;
  file: string | null;
  includedFrom: { file: string } | null;
  spellingLoc: ClangLoc | null;
  expansionLoc: ClangLoc | null;
}

export interface ClangNode {
  kind: (string & {}) | CDeclarationKind;
  name: string | null;
  loc: ClangLoc | null;
  range: { begin: ClangLoc | null; end: ClangLoc | null } | null;
  type: {
    desugaredQualType: string | null;
    qualType: string;
  } | null;
  isImplicit: boolean | null;
  inline: boolean | null;
  variadic: boolean | null;
  storageClass: string | null;
  completeDefinition: boolean | null;
  tagUsed: string | null;
  isBitField: boolean | null;
  bitWidth: number | null;
  inner: ClangNode[] | null;
  text: string | null;
  value: string | null;
}

export interface CASTNode {
  kind: string;
  loc: { line: number; column: number };
  doc: string | null;
}

export interface CTypeDecl {
  name: string;
  isConst: boolean;
  pointerDepth: number;
  arraySize: number | null;
  isFunctionPointer: boolean | null;
}

export interface CFunctionParam {
  type: CTypeDecl;
  name: string;
}

export interface CFunctionDecl extends CASTNode {
  kind: typeof DeclarationKind.FUNCTION;
  returnType: CTypeDecl;
  name: string;
  params: CFunctionParam[];
  variadic: boolean;
}

export interface CStructField {
  type: CTypeDecl;
  name: string;
  bitWidth: number | null;
}

export interface CStructDecl extends CASTNode {
  kind: typeof DeclarationKind.STRUCT;
  name: string;
  fields: CStructField[];
  isOpaque: boolean;
}

export interface CUnionDecl extends CASTNode {
  kind: typeof DeclarationKind.UNION;
  name: string;
  fields: CStructField[];
  isOpaque: boolean;
}

export interface CFunctionPointerDecl extends CASTNode {
  kind: typeof DeclarationKind.FUNCTION_POINTER;
  name: string;
  returnType: CTypeDecl;
  params: CFunctionParam[];
}

export interface CTypedefDecl extends CASTNode {
  kind: typeof DeclarationKind.TYPEDEF;
  name: string;
  underlyingType: CTypeDecl | CFunctionPointerDecl;
  tag: CDeclarationTag | null;
}

export interface CEnumConstant {
  name: string;
  value: number;
  /** false when the value expression wasn't a literal (e.g. an alias). */
  valueKnown: boolean;
}

export interface CEnumDecl extends CASTNode {
  kind: typeof DeclarationKind.ENUM;
  name: string;
  constants: CEnumConstant[];
  isOpaque: boolean;
}

export interface CVarDecl extends CASTNode {
  kind: typeof DeclarationKind.VAR;
  name: string;
  type: CTypeDecl;
}

export interface CHeaderDecl {
  kind: typeof DeclarationKind.HEADER;
  filename: string;
  declarations: CASTNode[];
}
