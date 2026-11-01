/**
 * Target registry — one entry per native library bound through FFI.
 * Adding a library is one entry here (plus a bindings folder); the
 * pipeline in generate.ts is generic.
 */

export interface TargetSpec {
  /** Library short name: file prefix, output folder, defs export name. */
  name: string;
  origin: string;
  /** Header path relative to the base include dir. */
  headerRel: string;
  prefixes: string[];
  /** Subdirectory of the include dir to scan for numeric #defines. */
  definesSubdir?: string;
}

/** Base include dir exposing SDL3/ plus the satellite header dirs. */
export function includeDir(): string {
  if (process.env.TSGUI_SDL3_INCLUDE) return process.env.TSGUI_SDL3_INCLUDE;
  if (process.platform === "darwin") return "/opt/homebrew/include";
  if (process.platform === "linux") return "/usr/include";
  throw new Error(
    "codegen: set TSGUI_SDL3_INCLUDE to the base include directory (contains SDL3/, SDL3_image/, …)"
  );
}

/**
 * SDL3 satellite libraries — everything else derives from the name.
 * The derived `SDL_<NAME>_` prefix picks up the version #defines.
 */
const SATELLITES = [
  { name: "image", prefixes: ["IMG_"] },
  { name: "ttf", prefixes: ["TTF_"] },
  { name: "mixer", prefixes: ["MIX_"] },
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
      } satisfies TargetSpec,
    ])
  ),
};
