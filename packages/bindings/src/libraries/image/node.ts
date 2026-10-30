/** SDL3_image backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { imageDefs } from "./generated/defs-node.ts";
import { createImageFunctions, type ImageFunctions } from "./generated/functions.ts";
import type { ImageSymbols } from "./generated/types.ts";
import { resolveLibrary } from "./path.ts";
import { wrapStringReturns } from "../../string-returns.ts";

const raw = wrapStringReturns(
  imageDefs,
  dlopen(resolveLibrary(), imageDefs).functions
) as unknown as ImageSymbols;

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const imageRaw: ImageSymbols = raw;

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const image: ImageFunctions = createImageFunctions(raw);
