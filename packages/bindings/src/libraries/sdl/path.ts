/** Locate the SDL3 shared library on this machine. */
import { resolveDylib } from "../../ffi.ts";

const CANDIDATES: Record<string, string[]> = {
  darwin: ["/opt/homebrew/lib/libSDL3.dylib", "/usr/local/lib/libSDL3.dylib"],
  linux: ["libSDL3.so.0", "libSDL3.so"],
  win32: ["SDL3.dll"],
};

export function resolveLibrary(): string {
  return resolveDylib(
    "SDL3",
    "TSGUI_SDL3_PATH",
    CANDIDATES[process.platform] ?? []
  );
}
