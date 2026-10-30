/** SDL3 backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { sdlDefs } from "./generated/defs-node.ts";
import { resolveSdlLibrary } from "./path.ts";

export const sdl = dlopen(resolveSdlLibrary(), sdlDefs).functions;
