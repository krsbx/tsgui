/**
 * @tsgui/bindings — the ONLY package that talks to native code.
 *
 * Exports:
 *   - `sdl`        raw SDL3 surface (backend-mapped, flying-pan style —
 *                  hardcore mode: everything the FFI table carries)
 *   - constants    `EventType`, `Define`, … generated from the SDL headers
 *   - `runtime`    which backend loaded
 *
 * Both backends borrow ArrayBuffers for pointer arguments and keep pointer
 * values opaque within a process — code written against `sdl` is
 * backend-agnostic as long as handles only flow through FFI calls.
 */
import type { sdl as sdlBunType } from "./sdl-bun.ts";

export * from "./generated/sdl-constants.ts";

export type Sdl = typeof sdlBunType;
export type Runtime = "bun" | "node";

export const runtime: Runtime =
  typeof globalThis.Bun !== "undefined" ? "bun" : "node";

const backend = await (runtime === "bun"
  ? import("./sdl-bun.ts")
  : import("./sdl-node.ts"));

/** Raw SDL3, loaded through the runtime's FFI. */
export const sdl: Sdl = backend.sdl as unknown as Sdl;
