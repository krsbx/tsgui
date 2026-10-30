/** SDL3_mixer backend for Bun — bun:ffi dlopen over the generated table. */
import { dlopen } from "bun:ffi";
import { mixerDefs } from "./generated/defs-bun.ts";
import { resolveLibrary } from "./path.ts";

export const mixer = dlopen(resolveLibrary(), mixerDefs).symbols;
