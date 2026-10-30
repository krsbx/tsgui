/** SDL3_ttf backend for Node — node:ffi dlopen over the generated table. */
import { dlopen } from "node:ffi";
import { ttfDefs } from "./generated/defs-node.ts";
import { resolveLibrary } from "./path.ts";

export const ttf = dlopen(resolveLibrary(), ttfDefs).functions;
