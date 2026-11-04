import { resolveLibraryExtension } from "@vulcania/devtools";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extension = resolveLibraryExtension();

process.env.VULCANIA_SDL3_IMAGE_PATH = resolve(
  __dirname,
  `ffi/libSDL3_image.0.4.8${extension}`
);

process.env.VULCANIA_SDL3_MIXER_PATH = resolve(
  __dirname,
  `ffi/libSDL3_mixer.0.2.4${extension}`
);

process.env.VULCANIA_SDL3_PATH = resolve(
  __dirname,
  `ffi/libSDL3.0${extension}`
);

process.env.VULCANIA_SDL3_SHADERCROSS_PATH = resolve(
  __dirname,
  `ffi/libSDL3_shadercross${extension}`
);

process.env.VULCANIA_SDL3_TTF_PATH = resolve(
  __dirname,
  `ffi/libSDL3_ttf.0.2.2${extension}`
);
