/** SDL3_image backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { imageDefs } from "./generated/defs-node.ts";
import { resolveLibrary } from "./path.ts";

export const image = dlopen(resolveLibrary(), imageDefs).functions;
