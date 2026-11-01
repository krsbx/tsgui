/**
 * Generator for the per-library types file: pointer brands, the
 * `<Lib>Symbols` positional surface, and cross-library brand imports.
 */
import type { FfiTables } from "../model/index.ts";
import { banner } from "./shared.ts";

export function generateTypes(
  tables: FfiTables,
  pascalName: string,
  namePrefix: string
): string {
  const L = banner(`pointer brands + symbols type for ${pascalName}`);

  // Satellite libraries reference core handles (SDL_Window, …): import
  // them from the sdl target's types instead of re-declaring.
  const imported = tables.handleTypes.filter(
    (h) => h.startsWith("SDL_") && namePrefix !== "SDL_"
  );
  L.push(`/**`);
  L.push(
    ` * Opaque native pointer. Backend-shaped at runtime (bun:ffi Pointer /`
  );
  L.push(` * node:ffi bigint) — branded here so handles are compile-checked.`);
  L.push(` */`);
  L.push(`export type Pointer = bigint & { readonly pointer: true };`);
  L.push(``);
  if (imported.length > 0) {
    L.push(`// Core handles from the sdl target.`);
    L.push(
      `import type { ${imported.join(", ")} } from "../../sdl/generated/types.ts";`
    );
    L.push(
      `export type { ${imported.join(", ")} } from "../../sdl/generated/types.ts";`
    );
    L.push(``);
  }
  const local = tables.handleTypes.filter((h) => !imported.includes(h));
  for (const h of local) {
    L.push(
      `export type ${h} = Pointer & { readonly handle: ${JSON.stringify(h)} };`
    );
  }
  if (local.length > 0) L.push(``);
  L.push(`export type AnyPointer = Pointer | ArrayBufferView | ArrayBuffer;`);
  L.push(``);

  L.push(`/** Raw positional surface of the loaded ${pascalName} library. */`);
  L.push(`export interface ${pascalName}Symbols {`);
  for (const fn of tables.functions) {
    const args = fn.args.map((a) => `${a.name}: ${a.ts}`).join(", ");
    L.push(`  ${fn.name}(${args}): ${fn.returns.ts};`);
  }
  L.push(`}`);
  L.push(``);
  return L.join("\n");
}
