/**
 * @vulcania/bindings — the ONLY package that talks to native code.
 *
 * One folder per library under `libraries/<name>/` (loaders, path
 * resolution, generated tables). Adding a library = adding a folder +
 * one re-export line here. Nothing library-specific lives above this file.
 *
 * Libraries currently load eagerly at import; if one ever becomes
 * optional-heavy, give it a lazy `loadXxx()` instead of eager top-level await.
 */
export { readCString } from "./read-cstring.ts";
export { runtime, type Runtime } from "./runtime.ts";

export * from "./libraries/image/index.ts";
export * from "./libraries/mixer/index.ts";
export * from "./libraries/sdl/index.ts";
export * from "./libraries/shadercross/node.ts";
export * from "./libraries/ttf/index.ts";
