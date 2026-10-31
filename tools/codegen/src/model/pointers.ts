/** Pointer-to-type classification: branded handles vs caller memory. */
import type { CTypeDecl } from "../clang/types";
import { PRIMITIVES } from "./kinds";

/**
 * Complete 2D data structs that SDL both returns AND accepts as
 * caller-constructed memory. These stay buffer-typed even when a function
 * somewhere returns a pointer to them (the handle/data rule would
 * otherwise over-brand them).
 */
const DATA_STRUCTS = new Set([
  "SDL_Rect",
  "SDL_FRect",
  "SDL_Point",
  "SDL_FPoint",
  "SDL_Color",
  "SDL_FColor",
  "SDL_Vertex",
  "SDL_Event",
]);

/**
 * Classify a pointer-to-type into its TypeScript type:
 *   - pointee is an incomplete type (never defined in the headers), OR a
 *     complete type that some function RETURNS as a pointer (SDL_Texture,
 *     SDL_Surface, … — you obtain them, never construct them)
 *     → a branded handle (`SDL_Window`, `SDL_Renderer`, …)
 *   - pointee is void/primitive/enum/complete-struct that nothing returns
 *     → memory the caller constructs (`ArrayBufferView` — TypedArrays
 *       keep flowing)
 * Pointers are nullable: C's default-argument patterns rely on it.
 */
export function classifyPointerTs(
  t0: CTypeDecl,
  aliases: Map<string, CTypeDecl>,
  enumNames: Set<string>,
  completeRecords: Set<string>,
  returnedPointees: Set<string>,
  handleNames: Set<string>
): string | null {
  let t = t0;
  for (let i = 0; aliases.has(t.name) && i < 8; i++) {
    t = aliases.get(t.name)!;
  }
  if (t.isFunctionPointer) return null;

  if (t.name === "void") {
    // C void* accepts any memory — buffers and opaque pointers alike.
    return "AnyPointer | null";
  }
  const isData =
    (completeRecords.has(t.name) && !returnedPointees.has(t.name)) ||
    DATA_STRUCTS.has(t.name);
  if (PRIMITIVES[t.name] !== undefined || enumNames.has(t.name) || isData) {
    // Memory the caller constructs: TypedArray / DataView / ArrayBuffer.
    return "ArrayBufferView | ArrayBuffer | null";
  }
  handleNames.add(t.name);
  return `${t.name} | null`;
}
