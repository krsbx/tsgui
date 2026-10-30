/** SDL3 backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { sdlDefs } from "./generated/defs-bun.ts";
import { resolveSdlLibrary } from "./path.ts";

export const sdl = dlopen(resolveSdlLibrary(), sdlDefs).symbols;
