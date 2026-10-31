/** SDL3_image bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";

export * from "./generated/constants.ts";
export type { ImageSymbols } from "./generated/types.ts";
export type { ImageFunctions } from "./generated/functions.ts";
import type { ImageSymbols } from "./generated/types.ts";
import { asImageSymbols, type ImageFunctions } from "./generated/functions.ts";

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const imageRaw: ImageSymbols = asImageSymbols(backend.imageRaw);

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const image: ImageFunctions = backend.image;
