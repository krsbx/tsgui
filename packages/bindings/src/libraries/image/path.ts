/** Locate the SDL3_image shared library on this machine. */
import { resolveDylib } from "../../ffi.ts";

const CANDIDATES: Record<string, string[]> = {
  darwin: [
    "/opt/homebrew/lib/libSDL3_image.dylib",
    "/usr/local/lib/libSDL3_image.dylib",
  ],
  linux: ["libSDL3_image.so.0", "libSDL3_image.so"],
  win32: ["SDL3_image.dll"],
};

export function resolveLibrary(): string {
  return resolveDylib(
    "SDL3_image",
    "TSGUI_SDL3_IMAGE_PATH",
    CANDIDATES[process.platform] ?? []
  );
}
