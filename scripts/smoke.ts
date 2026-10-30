/**
 * Headless smoke test — loads the native bindings and verifies SDL talks to
 * us, without opening a window. Runs on Bun and Node.
 *
 *   bun run smoke        (bun:ffi backend)
 *   bun run smoke:node   (node:ffi backend, Node >= 26.9)
 */
import { runtime, sdl } from "@tsgui/bindings";

const version = sdl.SDL_GetVersion();
const major = Math.floor(version / 1_000_000);
const minor = Math.floor(version / 1_000) % 1_000;
const patch = version % 1_000;

if (major !== 3) {
  throw new Error(`smoke: expected SDL3, found ${major}.${minor}.${patch}`);
}

console.log(`smoke: runtime=${runtime}, SDL ${major}.${minor}.${patch} — ok`);
