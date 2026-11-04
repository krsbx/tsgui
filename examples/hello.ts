/**
 * Phase 0 exit demo — an SDL3 window that clears to a solid color, from
 * pure TypeScript through the generated FFI bindings. No compiled code.
 *
 *   bun run examples/hello.ts              # run until the window closes
 *   bun run examples/hello.ts --selftest   # exit after ~120 frames (CI)
 */
import { EventType, Scancode, sdl, SdlDefines } from "@vulcania/bindings";

const selftest = process.argv.includes("--selftest");

if (!sdl.SDL_Init({ flags: SdlDefines.SDL_INIT_VIDEO })) {
  throw new Error(`SDL_Init failed: ${sdl.SDL_GetError()}`);
}

const window = sdl.SDL_CreateWindow({
  title: "vulcania — phase 0",
  w: 1280,
  h: 800,
  flags: SdlDefines.SDL_WINDOW_RESIZABLE,
});
if (!window) {
  sdl.SDL_Quit();
  throw new Error(`SDL_CreateWindow failed: ${sdl.SDL_GetError()}`);
}

const renderer = sdl.SDL_CreateRenderer({ window, name: null });
if (!renderer) {
  throw new Error(`SDL_CreateRenderer failed: ${sdl.SDL_GetError()}`);
}

// SDL_Event is a 64-byte union on every desktop platform; only the type
// field (offset 0) and, for keys, the scancode (offset 24) are decoded here.
const eventData = new Uint8Array(256);
const eventView = new DataView(eventData.buffer);

let running = true;
let frames = 0;

while (running) {
  while (sdl.SDL_PollEvent({ event: eventData })) {
    const type = eventView.getUint32(0, true);
    if (type === EventType.SDL_EVENT_QUIT) running = false;
    if (type === EventType.SDL_EVENT_WINDOW_CLOSE_REQUESTED) running = false;
    if (type === EventType.SDL_EVENT_KEY_DOWN) {
      const scancode = eventView.getUint32(24, true);
      if (scancode === Scancode.SDL_SCANCODE_ESCAPE) running = false;
    }
  }

  sdl.SDL_SetRenderDrawColor({ renderer, r: 32, g: 36, b: 48, a: 255 });
  sdl.SDL_RenderClear({ renderer });
  sdl.SDL_RenderPresent({ renderer });

  frames++;
  if (selftest && frames >= 120) running = false;

  sdl.SDL_Delay({ ms: 16 }); // ~60fps without busy-spinning
}

sdl.SDL_DestroyRenderer({ renderer });
sdl.SDL_DestroyWindow({ window });
sdl.SDL_Quit();

console.log(`hello: ${frames} frames, ok`);
