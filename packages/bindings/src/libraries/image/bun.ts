/** SDL3_image backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { imageDefs } from "./generated/defs-bun.ts";
import { createImageFunctions, type ImageFunctions } from "./generated/functions.ts";
import type { ImageSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const imageRaw: ImageSymbols = dlopen(
  resolveLibrary(),
  imageDefs
).symbols as unknown as ImageSymbols;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const image: ImageFunctions = createImageFunctions(imageRaw);
