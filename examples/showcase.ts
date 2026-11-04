/**
 * Phase 2 showcase — the renderer's paint vocabulary in one window:
 * rounded rects (tessellated), scissor clipping, a real PNG texture
 * (generated at runtime, decoded through the image tier), and text
 * through the ttf tier.
 *
 *   bun run examples/showcase.ts              # run until window closes
 *   bun run examples/showcase.ts --selftest   # exit after 240 frames
 *   node examples/showcase.ts --selftest
 */
import {
  EventType,
  image,
  PixelFormat,
  Scancode,
  sdl,
  SdlDefines,
} from "@vulcania/bindings";
import { destroyTexture, GpuRenderer, rgba, TtfFont } from "@vulcania/gpu";

const selftest = process.argv.includes("--selftest");

if (!sdl.SDL_Init({ flags: SdlDefines.SDL_INIT_VIDEO })) {
  throw new Error(`SDL_Init failed: ${sdl.SDL_GetError()}`);
}

const window = sdl.SDL_CreateWindow({
  title: "vulcania — phase 2 showcase",
  w: 1280,
  h: 800,
  flags: SdlDefines.SDL_WINDOW_RESIZABLE,
});
if (!window) throw new Error(`SDL_CreateWindow: ${sdl.SDL_GetError()}`);

const gpu = new GpuRenderer(window);
gpu.clearColor = { r: 24, g: 26, b: 34, a: 255 };

const FONT_PATHS = [
  process.env.VULCANIA_FONT_PATH,
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
].filter((p): p is string => !!p);

const font = new TtfFont(gpu.renderer, FONT_PATHS[0]!, 24);
const fontSmall = new TtfFont(gpu.renderer, FONT_PATHS[0]!, 16);

// --- a real PNG, generated at runtime through SDL surfaces ---------------
const PNG_PATH = "/tmp/vulcania-showcase.png";
{
  const surface = sdl.SDL_CreateSurface({
    width: 256,
    height: 256,
    format: PixelFormat.SDL_PIXELFORMAT_RGBA32,
  });
  if (!surface) throw new Error(`SDL_CreateSurface: ${sdl.SDL_GetError()}`);
  const purple = rgba({ r: 128, g: 96, b: 220 });
  const gold = rgba({ r: 240, g: 190, b: 80 });
  sdl.SDL_FillSurfaceRect({ dst: surface, rect: null, color: purple });
  for (let i = 0; i < 4; i++) {
    const rect = new Int32Array([32 + i * 56, 64, 40, 128]);
    sdl.SDL_FillSurfaceRect({ dst: surface, rect, color: gold });
  }
  if (!sdl.SDL_SavePNG({ surface, file: PNG_PATH })) {
    throw new Error(`SDL_SavePNG: ${sdl.SDL_GetError()}`);
  }
  sdl.SDL_DestroySurface({ surface });
}

const photo = image.IMG_LoadTexture({ renderer: gpu.renderer, file: PNG_PATH });
if (!photo) throw new Error(`IMG_LoadTexture: ${sdl.SDL_GetError()}`);

// --- frame loop ----------------------------------------------------------
const eventData = new Uint8Array(256);
const eventView = new DataView(eventData.buffer);

let running = true;
let frame = 0;

while (running) {
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

  // panel
  gpu.fillRoundedRect({
    x: 40,
    y: 40,
    w: 1200,
    h: 720,
    radius: 24,
    color: rgba({ r: 38, g: 42, b: 56 }),
  });
  gpu.fillRoundedRect({
    x: 40,
    y: 40,
    w: 1200,
    h: 56,
    radius: 24,
    color: rgba({ r: 48, g: 54, b: 74 }),
  });

  font.draw(gpu, {
    x: 64,
    y: 52,
    text: "vulcania — phase 2 showcase",
    tint: rgba({ r: 235, g: 238, b: 245 }),
  });

  // clipped image pane: only the intersection with the clip rect shows
  gpu.pushClip({ x: 80, y: 140, w: 500, h: 360 });
  gpu.fillRect({
    x: 80,
    y: 140,
    w: 500,
    h: 360,
    color: rgba({ r: 16, g: 18, b: 26 }),
  });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      gpu.drawTexture({
        texture: photo,
        x: 96 + col * 160,
        y: 156 + row * 160,
        w: 128,
        h: 128,
      });
    }
  }
  gpu.popClip();

  // rounded accent cards
  const cardColors = [
    rgba({ r: 90, g: 120, b: 220 }),
    rgba({ r: 220, g: 120, b: 90 }),
    rgba({ r: 110, g: 190, b: 130 }),
  ];
  for (let i = 0; i < 3; i++) {
    gpu.fillRoundedRect({
      x: 640 + i * 190,
      y: 200,
      w: 160,
      h: 120,
      radius: 18,
      color: cardColors[i]!,
      segments: 12,
    });
  }

  font.draw(gpu, {
    x: 640,
    y: 150,
    text: "rounded cards (tessellated)",
    tint: rgba({ r: 200, g: 205, b: 220 }),
  });
  fontSmall.draw(gpu, {
    x: 80,
    y: 520,
    text: "clipped image pane — one RenderGeometry per texture batch",
    tint: rgba({ r: 160, g: 168, b: 190 }),
  });
  fontSmall.draw(gpu, {
    x: 640,
    y: 520,
    text: "SDL_Renderer GPU backend + ttf text + image decode",
    tint: rgba({ r: 160, g: 168, b: 190 }),
  });

  gpu.present();
  frame++;
  if (selftest && frame >= 240) running = false;
  sdl.SDL_Delay({ ms: 16 });
}

const FRAMES = frame;

destroyTexture(photo);
font.destroy();
fontSmall.destroy();
gpu.destroy();
sdl.SDL_DestroyWindow({ window });
sdl.SDL_Quit();

console.log(`showcase: ${FRAMES} frames, ok`);
