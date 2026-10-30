/** Locate the SDL3_mixer shared library on this machine. */
import { resolveDylib } from "../../ffi.ts";

const CANDIDATES: Record<string, string[]> = {
  darwin: ["/opt/homebrew/lib/libSDL3_mixer.dylib", "/usr/local/lib/libSDL3_mixer.dylib"],
  linux: ["libSDL3_mixer.so.0", "libSDL3_mixer.so"],
  win32: ["SDL3_mixer.dll"],
};

export function resolveLibrary(): string {
  return resolveDylib("SDL3_mixer", "TSGUI_SDL3_MIXER_PATH", CANDIDATES[process.platform] ?? []);
}
