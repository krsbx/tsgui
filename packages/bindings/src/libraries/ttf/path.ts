/** Locate the SDL3_ttf shared library on this machine. */
import { resolveDylib } from "../../ffi.ts";

const CANDIDATES: Record<string, string[]> = {
  darwin: ["/opt/homebrew/lib/libSDL3_ttf.dylib", "/usr/local/lib/libSDL3_ttf.dylib"],
  linux: ["libSDL3_ttf.so.0", "libSDL3_ttf.so"],
  win32: ["SDL3_ttf.dll"],
};

export function resolveLibrary(): string {
  return resolveDylib("SDL3_ttf", "TSGUI_SDL3_TTF_PATH", CANDIDATES[process.platform] ?? []);
}
