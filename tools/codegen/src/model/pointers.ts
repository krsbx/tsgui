/** Pointer-to-type classification: branded handles vs caller memory. */
import type { CTypeDecl } from '../clang/types';
import { PRIMITIVES } from './kinds';

/**
 * Classify a pointer-to-type into its TypeScript type:
 *   - pointee is an opaque/incomplete type (never defined in the headers)
 *     → a branded handle (`SDL_Window`, `SDL_Renderer`, …) — C's own
 *       opacity rule, straight from the AST's completeDefinition
 *   - pointee is void/primitive/enum/complete-struct → memory the caller
 *     constructs (`ArrayBufferView` — TypedArrays keep flowing)
 * Pointers are nullable: C's default-argument patterns rely on it.
 */
export function classifyPointerTs(
  t0: CTypeDecl,
  aliases: Map<string, CTypeDecl>,
  enumNames: Set<string>,
  completeRecords: Set<string>,
  handleNames: Set<string>
): string | null {
  let t = t0;
  for (let i = 0; aliases.has(t.name) && i < 8; i++) {
    t = aliases.get(t.name)!;
  }
  if (t.isFunctionPointer) return null;

  if (t.name === 'void') {
    // C void* accepts any memory — buffers and opaque pointers alike.
    return 'AnyPointer | null';
  }
  if (
    PRIMITIVES[t.name] !== undefined ||
    enumNames.has(t.name) ||
    completeRecords.has(t.name)
  ) {
    // Memory the caller constructs: TypedArray / DataView / ArrayBuffer.
    return 'ArrayBufferView | ArrayBuffer | null';
  }
  handleNames.add(t.name);
  return `${t.name} | null`;
}
