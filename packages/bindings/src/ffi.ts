/**
 * Shared dylib-resolution helper for library loaders.
 *
 * Resolution order: environment override → existing absolute candidates →
 * bare soname (delegates to the system loader search path).
 */
import { existsSync } from "node:fs";

export function resolveDylib(
  what: string,
  envVar: string,
  candidates: string[]
): string {
  const override = process.env[envVar];
  if (override) return override;

  for (const candidate of candidates) {
    // Bare sonames pass through to the system loader's search path.
    if (!candidate.includes("/") || existsSync(candidate)) return candidate;
  }

  throw new Error(
    `vulcania: ${what} shared library not found — install it or set ${envVar}`
  );
}
