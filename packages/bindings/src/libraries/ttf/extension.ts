/**
 * SDL3_ttf binding extensions — functions the generated table cannot
 * carry, declared here in one hand-written place.
 *
 * Two exports per extension:
 *   - `ttfExtensionDefs`      raw dlopen defs in the backend-neutral
 *                             string dialect (loaders translate for bun)
 *   - `ttfExtension(symbols)` object-param wrappers over the extended
 *                             symbol surface, merged into `ttf` by the loaders
 */
import {
  type FnDef,
  handle,
  type SymbolsFromDefs,
} from "../../resolve-defs.ts";
import type { SDL_Surface, TTF_Font, TtfSymbols } from "./generated/types.ts";

/** Raw dlopen defs — backend-neutral string dialect. */
export const ttfExtensionDefs = {
  /**
   * ABI shortcut: SDL_Color is a 4×u8 struct, and the SysV/AArch64/Win64
   * ABIs pass a 4-byte struct like a u32 (little-endian packed) — hence
   * the u32 `color` instead of a by-value SDL_Color, which bun:ffi and
   * node:ffi cannot express.
   */
  TTF_RenderText_Blended: {
    // (font, text, length — 0 = null-terminated, color)
    arguments: [handle<TTF_Font>(), "string", "u64", "u32"],
    return: handle<SDL_Surface>(),
  },
} as const satisfies Record<string, FnDef>;

/**
 * The ttf symbol surface plus the extension functions, derived from
 * `ttfExtensionDefs` — no hand-written parallel interface.
 */
export type TtfExtensionSymbols = TtfSymbols &
  SymbolsFromDefs<typeof ttfExtensionDefs>;

/** Object-param surface for the extension functions. */
export interface TtfExtensionFunctions {
  TTF_RenderText_Blended(opts: {
    font: TTF_Font;
    text: string;
    /** 0 = null-terminated. */
    length?: number;
    color: number;
  }): SDL_Surface | null;
}

export function ttfExtension(symbols: TtfExtensionSymbols): TtfExtensionFunctions {
  return {
    TTF_RenderText_Blended(opts: {
      font: TTF_Font;
      text: string;
      /** 0 = null-terminated. */
      length?: number;
      color: number;
    }): SDL_Surface | null {
      return symbols.TTF_RenderText_Blended(
        opts.font,
        opts.text,
        opts.length ?? 0,
        opts.color
      );
    },
  };
}
