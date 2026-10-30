/** SDL3_mixer bindings. Pointer values are opaque and backend-specific. */
import { runtime } from "../../runtime.ts";
import type { mixer as mixerBunType } from "./bun.ts";

export * from "./generated/constants.ts";

export type Umixer = typeof mixerBunType;

const backend = await (runtime === "bun"
  ? import("./bun.ts")
  : import("./node.ts"));

export const mixer: Umixer = backend.mixer as unknown as Umixer;
