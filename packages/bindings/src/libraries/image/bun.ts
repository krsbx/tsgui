/** SDL3_image backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { imageDefs } from "./generated/defs-bun.ts";
import { resolveLibrary } from "./path.ts";

export const image = dlopen(resolveLibrary(), imageDefs).symbols;
