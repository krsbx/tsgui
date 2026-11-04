// Auto inject library path
import { resolve } from "node:path";
import { resolveLibraryExtension, resolveLibraryPath } from "./resolver";

const extension = resolveLibraryExtension();

process.env.VULCANIA_SDL3_IMAGE_PATH = resolve(
  process.execPath,
  resolveLibraryPath(),
  `libSDL3_image.0.4.8${extension}`
);

process.env.VULCANIA_SDL3_MIXER_PATH = resolve(
  process.execPath,
  resolveLibraryPath(),
  `libSDL3_mixer.0.2.4${extension}`
);

process.env.VULCANIA_SDL3_PATH = resolve(
  process.execPath,
  resolveLibraryPath(),
  `libSDL3.0${extension}`
);

process.env.VULCANIA_SDL3_SHADERCROSS_PATH = resolve(
  process.execPath,
  resolveLibraryPath(),
  `libSDL3_shadercross${extension}`
);

process.env.VULCANIA_SDL3_TTF_PATH = resolve(
  process.execPath,
  resolveLibraryPath(),
  `libSDL3_ttf.0.2.2${extension}`
);
