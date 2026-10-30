/**
 * Generator layer — one file per generated output file:
 *   gen/constants.ts   → <lib>/generated/constants.ts
 *   gen/defs-bun.ts    → <lib>/generated/defs-bun.ts
 *   gen/defs-node.ts   → <lib>/generated/defs-node.ts
 *   gen/types.ts       → <lib>/generated/types.ts (brands + symbols)
 *   gen/functions.ts   → <lib>/generated/functions.ts (object-param surface)
 */
export { generateFfiConstants } from './constants.ts';
export { generateBunDefs } from './defs-bun.ts';
export { generateNodeDefs } from './defs-node.ts';
export { generateTypes } from './types.ts';
export { generateFunctions } from './functions.ts';
export { summarizeUnsafe } from './report.ts';
