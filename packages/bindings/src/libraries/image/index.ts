/** SDL3_image bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";
import type { image as imageBunType } from "./bun.ts";

export * from "./generated/constants.ts";

export type Uimage = typeof imageBunType;

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

export const image: Uimage = backend.image as unknown as Uimage;
