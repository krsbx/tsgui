/**
 * Minimal ambient types for node:ffi (stable in Node >= 26.9; the module is
 * experimental). Only the surface @tsgui/bindings uses is declared.
 */
declare module "node:ffi" {
  export interface DlopenDef {
    arguments?: readonly string[];
    return?: string;
  }

  export interface DlopenResult {
    lib: unknown;
    functions: Record<string, (...args: never[]) => unknown>;
  }

  /** Load a shared library and resolve its declared symbols. */
  export function dlopen(
    path: string,
    definitions: Record<string, DlopenDef>
  ): DlopenResult;

  /** Shared-library suffix on this platform: dylib | so | dll. */
  export const suffix: string;
}
