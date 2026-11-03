/** SDL3_shadercross bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";
import {
  asShadercrossSymbols,
  type ShadercrossFunctions,
} from "./generated/functions.ts";
import type { ShadercrossSymbols } from "./generated/types.ts";

export * from "./generated/constants.ts";
export type { ShadercrossSymbols } from "./generated/types.ts";
export type { ShadercrossFunctions } from "./generated/functions.ts";

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

/** Raw positional symbols — the documented escape hatch (hot paths, internals). */
export const shadercrossRaw: ShadercrossSymbols = asShadercrossSymbols(
  backend.shadercrossRaw
);

/** Object-param surface — the toolkit convention (docs/ARCHITECTURE.md). */
export const shadercross: ShadercrossFunctions = backend.shadercross;
