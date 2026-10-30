/** SDL3_ttf backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { ttfDefs } from "./generated/defs-bun.ts";
import { resolveLibrary } from "./path.ts";

export const ttf = dlopen(resolveLibrary(), ttfDefs).symbols;
