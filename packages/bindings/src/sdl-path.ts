/**
 * Locate the SDL3 shared library on this machine.
 *
 * Resolution order:
 *   1. TSGUI_SDL3_PATH environment override
 *   2. platform-conventional absolute paths
 *   3. bare soname — delegates to the system loader search path
 */
import { existsSync } from "node:fs";

const CANDIDATES: Record<string, string[]> = {
  darwin: [
    "/opt/homebrew/lib/libSDL3.dylib",
    "/usr/local/lib/libSDL3.dylib",
  ],
  linux: ["libSDL3.so.0", "libSDL3.so"],
  win32: ["SDL3.dll"],
};

export function resolveSdlLibrary(): string {
  const override = process.env.TSGUI_SDL3_PATH;
  if (override) return override;

  for (const candidate of CANDIDATES[process.platform] ?? []) {
    // Bare sonames pass through to the system loader's search path.
    if (!candidate.includes("/") || existsSync(candidate)) return candidate;
  }

  throw new Error(
    "tsgui: SDL3 shared library not found — install SDL3 or set TSGUI_SDL3_PATH"
  );
}
