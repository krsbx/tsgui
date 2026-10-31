/**
 * Generator layer — one file per generated output file:
 *   gen/constants.ts   → <lib>/generated/constants.ts
 *   gen/defs.ts        → <lib>/generated/defs.ts (backend-neutral table)
 *   gen/types.ts       → <lib>/generated/types.ts (brands + symbols)
 *   gen/functions.ts   → <lib>/generated/functions.ts (object-param surface)
 */
export { generateFfiConstants } from "./constants.ts";
export { generateDefs } from "./defs.ts";
export { generateTypes } from "./types.ts";
export { generateFunctions } from "./functions.ts";
export { summarizeUnsafe } from "./report.ts";
