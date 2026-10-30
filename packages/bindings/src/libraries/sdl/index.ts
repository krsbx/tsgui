/**
 * SDL3 — the `sdl` hardcore tier.
 *
 * Pointer values are backend-specific but opaque: code written against
 * `sdl` is backend-agnostic as long as handles only flow through FFI
 * calls. ArrayBuffers/TypedArrays are borrowed for the duration of a call.
 */
import { runtime } from "../../runtime.ts";
import type { sdl as sdlBunType } from "./bun.ts";

export * from "./generated/constants.ts";

export type Sdl = typeof sdlBunType;

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

export const sdl: Sdl = backend.sdl as unknown as Sdl;
