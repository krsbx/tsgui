/** SDL3_ttf bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";
import type { ttf as ttfBunType } from "./bun.ts";

export * from "./generated/constants.ts";

export type Uttf = typeof ttfBunType;

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

export const ttf: Uttf = backend.ttf as unknown as Uttf;
