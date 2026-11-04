import { resolveLibraryExtension } from "@vulcania/devtools";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extension = resolveLibraryExtension();

function resolveLoadPath(filename: string): string {
  return resolve(__dirname, `ffi/${filename}${extension}`);
}

process.env.VULCANIA_SDL3_IMAGE_PATH = resolveLoadPath(`libSDL3_image.0.4.8`);

process.env.VULCANIA_SDL3_MIXER_PATH = resolveLoadPath(`libSDL3_mixer.0.2.4`);

process.env.VULCANIA_SDL3_PATH = resolveLoadPath(`libSDL3.0`);

process.env.VULCANIA_SDL3_SHADERCROSS_PATH =
  resolveLoadPath(`libSDL3_shadercross`);

process.env.VULCANIA_SDL3_TTF_PATH = resolveLoadPath(`libSDL3_ttf.0.2.2`);
