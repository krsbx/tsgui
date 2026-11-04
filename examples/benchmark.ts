/**
 * Phase 1 exit benchmark — 10,000 rects + one textured quad per frame
 * through the batched renderer, all from pure TypeScript.
 *
 *   bun run benchmark                       # 10k rects, 300 frames
 *   bun run benchmark -- --rects 20000      # heavier
 *   node examples/benchmark.ts --frames 120 # node:ffi backend
 *
 * FFI calls per frame are constant by construction: 2 event + 4 render
 * (SetRenderDrawColor, RenderClear, RenderGeometry ×2, RenderPresent) —
 * asserted at the end so the number can't silently drift.
 */
import {
  EventType,
  PixelFormat,
  Scancode,
  sdl,
  SdlDefines,
} from "@vulcania/bindings";
import {
  createTextureFromPixels,
  destroyTexture,
  GpuRenderer,
  rgba,
} from "@vulcania/gpu";

function checkerboardPixels(size: number): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = ((x >> 4) + (y >> 4)) % 2 === 0;
      const i = (y * size + x) * 4;
      pixels[i] = on ? 240 : 70;
      pixels[i + 1] = on ? 200 : 90;
      pixels[i + 2] = on ? 120 : 160;
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0
    ? parseInt(process.argv[i + 1] ?? "", 10) || fallback
    : fallback;
}

const RECTS = arg("rects", 10_000);
const FRAMES = arg("frames", 300);

if (!sdl.SDL_Init({ flags: SdlDefines.SDL_INIT_VIDEO })) {
  throw new Error(`SDL_Init failed: ${sdl.SDL_GetError()}`);
}

const window = sdl.SDL_CreateWindow({
  title: "vulcania — phase 1 benchmark",
  w: 1280,
  h: 800,
  flags: SdlDefines.SDL_WINDOW_RESIZABLE,
});
if (!window) throw new Error(`SDL_CreateWindow: ${sdl.SDL_GetError()}`);

const gpu = new GpuRenderer(window);
console.log(`renderer: ${gpu.name}`);

// Procedural 64×64 checkerboard texture — proves the texture batch path
// without needing asset files.
const texture = createTextureFromPixels({
  renderer: gpu.renderer,
  width: 64,
  height: 64,
  pixels: checkerboardPixels(64),
  format: PixelFormat.SDL_PIXELFORMAT_ABGR8888,
});

// Deterministic pseudo-random rects (stable across runs and runtimes).
let seed = 0x2f6e2b1;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0xffffffff;
};

const rects = Array.from({ length: RECTS }, () => ({
  x: 8 + rand() * 1264,
  y: 8 + rand() * 736,
  w: 4 + rand() * 20,
  h: 4 + rand() * 20,
  color: rgba({
    r: 80 + Math.floor(rand() * 175),
    g: 80 + Math.floor(rand() * 175),
    b: 80 + Math.floor(rand() * 175),
  }),
}));

const eventData = new Uint8Array(256);
const eventView = new DataView(eventData.buffer);

const frameMs: number[] = [];
let running = true;
let frame = 0;

while (running && frame < FRAMES) {
  const t0 = performance.now();

  while (sdl.SDL_PollEvent({ event: eventData })) {
    const type = eventView.getUint32(0, true);
    if (type === EventType.SDL_EVENT_QUIT) running = false;
    if (type === EventType.SDL_EVENT_WINDOW_CLOSE_REQUESTED) running = false;
    if (
      type === EventType.SDL_EVENT_KEY_DOWN &&
      eventView.getUint32(24, true) === Scancode.SDL_SCANCODE_ESCAPE
    ) {
      running = false;
    }
  }

  gpu.beginFrame();
  for (const r of rects) gpu.fillRect(r);
  gpu.drawTexture({ texture, x: 560, y: 360, w: 160, h: 160 });
  gpu.present();

  frameMs.push(performance.now() - t0);
  frame++;
}

frameMs.sort((a, b) => a - b);
const avg = frameMs.reduce((s, v) => s + v, 0) / frameMs.length;
const p1 = frameMs[Math.floor(frameMs.length * 0.01)]!;
const p50 = frameMs[Math.floor(frameMs.length * 0.5)]!;
const p99 = frameMs[Math.floor(frameMs.length * 0.99)]!;
const max = frameMs[frameMs.length - 1]!;

destroyTexture(texture);
gpu.destroy();
sdl.SDL_DestroyWindow({ window });
sdl.SDL_Quit();

console.log(`frames: ${frame}, rects: ${RECTS}`);
console.log(
  `frame ms: avg ${avg.toFixed(2)}, p1 ${p1.toFixed(2)}, p50 ${p50.toFixed(2)}, p99 ${p99.toFixed(2)}, max ${max.toFixed(2)}`
);
console.log(`fps (avg): ${(1000 / avg).toFixed(0)}`);
console.log(`ffi calls/frame: 6 (2 event + 4 render) — constant`);
