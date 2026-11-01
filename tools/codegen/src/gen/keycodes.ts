/**
 * Generator for @tsgui/core's KeyCode — the toolkit-interpreted keys,
 * with values straight from the scanned SDLK_ defines. Emitting them
 * keeps a hand-written copy from drifting when SDL moves a code: the
 * next `bun run codegen:sdl` picks up the new values.
 */
import type { DefineConstant } from "../defines.ts";
import { banner, hex } from "./shared.ts";

/** The keys the toolkit interprets: toolkit name → SDL keycode define. */
const KEYCODE_SOURCES = [
  ["Backspace", "SDLK_BACKSPACE"],
  ["Tab", "SDLK_TAB"],
  ["Enter", "SDLK_RETURN"],
  ["Space", "SDLK_SPACE"],
  ["Delete", "SDLK_DELETE"],
  ["Home", "SDLK_HOME"],
  ["End", "SDLK_END"],
  ["Right", "SDLK_RIGHT"],
  ["Left", "SDLK_LEFT"],
  ["Down", "SDLK_DOWN"],
  ["Up", "SDLK_UP"],
  ["A", "SDLK_A"],
  ["C", "SDLK_C"],
  ["V", "SDLK_V"],
  ["X", "SDLK_X"],
] as const;

export function generateCoreKeycodes(defines: DefineConstant[]): string {
  const L = banner("SDL3 headers — SDL_keycode.h defines");
  L.push(
    "/**",
    " * SDL keycodes the toolkit interprets. Letters are lowercase ASCII —",
    " * SDL letter keycodes are not shift-affected.",
    " */",
    "export const KeyCode = {"
  );

  for (const [name, sdl] of KEYCODE_SOURCES) {
    const define = defines.find((d) => d.name === sdl);
    if (!define) {
      throw new Error(
        `codegen[keys]: ${sdl} missing from the scanned defines — check the SDL headers and the defines scan prefixes`
      );
    }
    L.push(`  ${name}: ${hex(define.value)}, // ${sdl}`);
  }

  L.push(
    "} as const;",
    "",
    "export type KeyCode = (typeof KeyCode)[keyof typeof KeyCode];",
    ""
  );
  return L.join("\n");
}
