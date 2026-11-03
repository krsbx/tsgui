/**
 * Target registry — one entry per native library bound through FFI.
 * Adding a library is one entry here (plus a bindings folder); the
 * pipeline in generate.ts is generic.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Pinned header sources — git submodules under vendor/, used only as clang
 * input (`git submodule update --init`; no nested submodules needed).
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const vendorRoot = resolve(__dirname, "../../..", "vendor");

export interface TargetSpec {
  /** Library short name: file prefix, output folder, defs export name. */
  name: string;
  origin: string;
  /** Header path relative to the base include dir. */
  headerRel: string;
  prefixes: string[];
  /** Subdirectory of the include dir to scan for numeric #defines. */
  definesSubdir?: string;
  /** Submodule under vendor/ whose include/ holds this target's headers. */
  vendor: string;
}

/**
 * Include dir holding `spec`'s headers (`headerRel`, `definesSubdir`).
 * VULCANIA_SDL3_INCLUDE overrides with one base dir exposing SDL3/,
 * SDL3_image/, … (e.g. a system install).
 */
export function targetIncludeDir(spec: TargetSpec): string {
  return (
    process.env.VULCANIA_SDL3_INCLUDE ??
    join(vendorRoot, spec.vendor, "include")
  );
}

/**
 * Every `-I` dir for clang — all targets, since satellite headers include
 * <SDL3/SDL.h>.
 */
export function includeDirs(): string[] {
  const dirs = [...new Set(Object.values(TARGETS).map(targetIncludeDir))];
  const missing = dirs.filter((dir) => !existsSync(dir));
  if (missing.length > 0) {
    throw new Error(
      `codegen: missing headers in ${missing.join(", ")} — run \`git submodule update --init\` (or set VULCANIA_SDL3_INCLUDE)`
    );
  }
  return dirs;
}

/**
 * SDL3 satellite libraries — everything else derives from the name.
 * The derived `SDL_<NAME>_` prefix picks up the version #defines.
 */
const SATELLITES = [
  { name: "image", prefixes: ["IMG_"] },
  { name: "ttf", prefixes: ["TTF_"] },
  { name: "mixer", prefixes: ["MIX_"] },
  { name: "shadercross", prefixes: ["SDL_ShaderCross_"] },
] as const;

export const TARGETS: Record<string, TargetSpec> = {
  sdl: {
    name: "sdl",
    origin: "SDL3 headers",
    headerRel: "SDL3/SDL.h",
    // SDLK_ keycodes are plain #defines in SDL_keycode.h. KMOD_/AUDIO_/RW_
    // only exist as SDL_oldnames.h aliases, so they are deliberately omitted.
    prefixes: ["SDL_", "SDLK_"],
    definesSubdir: "SDL3",
    vendor: "SDL",
  },
  ...Object.fromEntries(
    SATELLITES.map(({ name, prefixes }) => [
      name,
      {
        name,
        origin: `SDL3_${name} headers`,
        headerRel: `SDL3_${name}/SDL_${name}.h`,
        prefixes: [...prefixes, `SDL_${name.toUpperCase()}_`],
        definesSubdir: `SDL3_${name}`,
        vendor: `SDL_${name}`,
      } satisfies TargetSpec,
    ])
  ),
};
