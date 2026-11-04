// Auto inject library path
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { resolveLibraryExtension, resolveLibraryPath } from "./resolver";

const extension = resolveLibraryExtension();

function resolveLoadPath(filename: string): string {
  return resolve(
    realpathSync(process.execPath),
    resolveLibraryPath(),
    `${filename}${extension}`
  );
}

process.env.VULCANIA_SDL3_IMAGE_PATH = resolveLoadPath(`libSDL3_image.0.4.8`);

process.env.VULCANIA_SDL3_MIXER_PATH = resolveLoadPath(`libSDL3_mixer.0.2.4`);

process.env.VULCANIA_SDL3_PATH = resolveLoadPath(`libSDL3.0`);

process.env.VULCANIA_SDL3_SHADERCROSS_PATH =
  resolveLoadPath(`libSDL3_shadercross`);

process.env.VULCANIA_SDL3_TTF_PATH = resolveLoadPath(`libSDL3_ttf.0.2.2`);
