/** SDL3_mixer backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { mixerDefs } from "./generated/defs-node.ts";
import { resolveLibrary } from "./path.ts";

export const mixer = dlopen(resolveLibrary(), mixerDefs).functions;
