/**
 * Locate the SDL3_shadercross shared library on this machine. There is no
 * Homebrew formula: it comes from a source build (`cmake --install`, default
 * prefix /usr/local), the SDL_shadercross release archive (`lib/`), or an
 * explicit VULCANIA_SDL3_SHADERCROSS_PATH.
 */
import { resolveDylib } from "../../ffi.ts";

const CANDIDATES: Record<string, string[]> = {
  darwin: [
    "/opt/homebrew/lib/libSDL3_shadercross.dylib",
    "/usr/local/lib/libSDL3_shadercross.dylib",
  ],
  linux: ["libSDL3_shadercross.so.0", "libSDL3_shadercross.so"],
  win32: ["SDL3_shadercross.dll"],
};

export function resolveLibrary(): string {
  return resolveDylib(
    "SDL3_shadercross",
    "VULCANIA_SDL3_SHADERCROSS_PATH",
    CANDIDATES[process.platform] ?? []
  );
}
