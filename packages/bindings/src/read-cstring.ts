/**
 * Read a NUL-terminated UTF-8 C string at a raw address — for event
 * payloads that carry `const char *` fields (SDL_EVENT_TEXT_INPUT.text),
 * which the wrapped tables don't cover.
 *
 * Runtime-split like the library loaders: bun:ffi's CString vs
 * node:ffi's address-to-string conversion (the same primitive
 * string-returns.ts uses for wrapped returns).
 */
import { runtime } from "./runtime.ts";

const backend = await (runtime === "bun"
  ? import("./read-cstring.bun.ts")
  : import("./read-cstring.node.ts"));

export const readCString: (pointer: number | bigint) => string =
  backend.readCString;
