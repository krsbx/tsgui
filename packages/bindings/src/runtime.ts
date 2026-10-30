/** Which runtime we're in — decided once, used by every library loader. */
export type Runtime = "bun" | "node";

export const runtime: Runtime =
  typeof globalThis.Bun !== "undefined" ? "bun" : "node";
