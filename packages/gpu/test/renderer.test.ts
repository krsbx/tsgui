/**
 * Pixel-readback guard — the op-count selftests can't see pixels, and this
 * is exactly where the SDL_Vertex ABI regression hid (garbage float colors
 * drew nothing while every call returned success) and where the missing
 * batch-counter reset hid (each flush re-rendered every earlier quad under
 * the newer batch's texture — tiled glyph noise over every draw).
 *
 * Runs against the software driver so readback is deterministic; skipped
 * when there is no display (headless CI).
 */
import { PixelFormat, sdl, SdlDefines } from "@tsgui/bindings";
import { afterAll, describe, expect, test } from "bun:test";
import {
  createTextureFromPixels,
  destroyTexture,
  GpuRenderer,
  rgba,
} from "../src/index.ts";

sdl.SDL_SetHint({ name: "SDL_VIDEO_ALLOW_SCREENSAVER", value: "0" });

const initOk = sdl.SDL_Init({ flags: SdlDefines.SDL_INIT_VIDEO });
const window = initOk
  ? sdl.SDL_CreateWindow({
      title: "tsgui gpu readback",
      w: 64,
      h: 64,
      flags: SdlDefines.SDL_WINDOW_HIDDEN,
    })
  : null;

type ReadbackSurface = NonNullable<ReturnType<typeof sdl.SDL_RenderReadPixels>>;

function readPixel(
  surface: ReadbackSurface,
  x: number,
  y: number
): [number, number, number, number] {
  const r = new Float32Array(1);
  const g = new Float32Array(1);
  const b = new Float32Array(1);
  const a = new Float32Array(1);
  if (!sdl.SDL_ReadSurfacePixelFloat({ surface, x, y, r, g, b, a })) {
    throw new Error(
      `SDL_ReadSurfacePixelFloat(${x},${y}): ${sdl.SDL_GetError()}`
    );
  }
  return [r[0]!, g[0]!, b[0]!, a[0]!];
}

function readback(gpu: GpuRenderer): ReadbackSurface {
  gpu.flush();
  const rect = new Int32Array([0, 0, 64, 64]);
  const surface = sdl.SDL_RenderReadPixels({ renderer: gpu.renderer, rect });
  if (!surface) throw new Error(`SDL_RenderReadPixels: ${sdl.SDL_GetError()}`);
  return surface;
}

describe("GpuRenderer pixels", () => {
  test.skipIf(!window)(
    "geometry lands on the framebuffer with SDL3 float vertex colors",
    () => {
      const gpu = new GpuRenderer(window!, { driver: "software" });
      gpu.clearColor = { r: 20, g: 24, b: 60, a: 255 };
      gpu.beginFrame();

      // Green rounded rect drawn first; red square covers its overlap.
      gpu.fillRoundedRect({
        x: 4,
        y: 4,
        w: 24,
        h: 24,
        radius: 8,
        color: rgba({ r: 0, g: 200, b: 0 }),
      });
      gpu.fillRect({
        x: 16,
        y: 16,
        w: 32,
        h: 32,
        color: rgba({ r: 255, g: 0, b: 0 }),
      });

      const surface = readback(gpu);

      // Inside the red square.
      {
        const [r, g, b, a] = readPixel(surface, 40, 40);
        expect(r).toBeGreaterThan(0.9);
        expect(g).toBeLessThan(0.1);
        expect(b).toBeLessThan(0.1);
        expect(a).toBeGreaterThan(0.9);
      }

      // Inside the rounded rect (away from red's overlap).
      {
        const [r, g, b] = readPixel(surface, 10, 10);
        expect(g).toBeGreaterThan(0.5);
        expect(r).toBeLessThan(0.2);
        expect(b).toBeLessThan(0.2);
      }

      // Rounded corner is cut away — clear color shows through.
      {
        const [r, g, b] = readPixel(surface, 5, 5);
        expect(b).toBeGreaterThan(r);
        expect(b).toBeGreaterThan(g);
        expect(r).toBeLessThan(0.3);
      }

      // Plain clear background bottom-left.
      {
        const [r, g, b] = readPixel(surface, 5, 60);
        expect(b).toBeGreaterThan(r);
        expect(b).toBeGreaterThan(g);
      }

      sdl.SDL_DestroySurface({ surface });
      gpu.destroy();
    }
  );

  test.skipIf(!window)(
    "a texture switch mid-frame flushes without contaminating other batches",
    () => {
      const gpu = new GpuRenderer(window!, { driver: "software" });
      gpu.clearColor = { r: 20, g: 24, b: 60, a: 255 };

      // 2×2 solid textures — green and blue.
      const solidPixels = (r: number, g: number, b: number): Uint8Array => {
        const px = new Uint8Array(2 * 2 * 4);
        for (let i = 0; i < 4; i++) {
          px[i * 4] = r;
          px[i * 4 + 1] = g;
          px[i * 4 + 2] = b;
          px[i * 4 + 3] = 255;
        }
        return px;
      };
      const greenTex = createTextureFromPixels({
        renderer: gpu.renderer,
        width: 2,
        height: 2,
        pixels: solidPixels(0, 200, 0),
        format: PixelFormat.SDL_PIXELFORMAT_RGBA32,
      });
      const blueTex = createTextureFromPixels({
        renderer: gpu.renderer,
        width: 2,
        height: 2,
        pixels: solidPixels(0, 0, 200),
        format: PixelFormat.SDL_PIXELFORMAT_RGBA32,
      });

      gpu.beginFrame();
      // Untextured → texture A → texture B → untextured: three flushes.
      gpu.fillRect({
        x: 16,
        y: 16,
        w: 16,
        h: 16,
        color: rgba({ r: 255, g: 0, b: 0 }),
      });
      gpu.drawTexture({ texture: greenTex, x: 40, y: 40, w: 16, h: 16 });
      gpu.drawTexture({ texture: blueTex, x: 40, y: 8, w: 16, h: 8 });
      gpu.fillRect({
        x: 4,
        y: 48,
        w: 24,
        h: 10,
        color: rgba({ r: 0, g: 0, b: 255 }),
      });

      const surface = readback(gpu);

      // The red square must survive the texture batch's flush still red.
      {
        const [r, g, b] = readPixel(surface, 20, 20);
        expect(r).toBeGreaterThan(0.9);
        expect(g).toBeLessThan(0.1);
        expect(b).toBeLessThan(0.1);
      }

      // The green-textured quad samples green.
      {
        const [r, g, b] = readPixel(surface, 48, 48);
        expect(g).toBeGreaterThan(0.5);
        expect(r).toBeLessThan(0.2);
        expect(b).toBeLessThan(0.2);
      }

      // The blue-textured quad samples blue.
      {
        const [r, g, b] = readPixel(surface, 48, 12);
        expect(b).toBeGreaterThan(0.5);
        expect(r).toBeLessThan(0.2);
        expect(g).toBeLessThan(0.2);
      }

      // The trailing untextured rect must not join the textured batch.
      {
        const [r, g, b] = readPixel(surface, 10, 52);
        expect(b).toBeGreaterThan(0.5);
        expect(r).toBeLessThan(0.2);
        expect(g).toBeLessThan(0.2);
      }

      sdl.SDL_DestroySurface({ surface });
      destroyTexture(greenTex);
      destroyTexture(blueTex);
      gpu.destroy();
    }
  );

  test.skipIf(!window)(
    "arc primitives rasterize pies and rings at the right angles",
    () => {
      const gpu = new GpuRenderer(window!, { driver: "software" });
      gpu.clearColor = { r: 0, g: 0, b: 0, a: 255 };
      gpu.beginFrame();

      // Quarter pie, down-right of its center, at (20,20) r16.
      gpu.fillArc({
        cx: 20,
        cy: 20,
        radius: 16,
        startAngle: 0,
        endAngle: Math.PI / 2,
        color: rgba({ r: 255, g: 0, b: 0 }),
      });
      // Right-half ring, at (44,44) band [6,14] — disjoint from the pie.
      gpu.fillRing({
        cx: 44,
        cy: 44,
        innerRadius: 6,
        radius: 14,
        startAngle: -Math.PI / 2,
        endAngle: Math.PI / 2,
        color: rgba({ r: 0, g: 200, b: 0 }),
      });

      const surface = readback(gpu);

      // Pie interior and center.
      {
        const [r, g, b] = readPixel(surface, 26, 26);
        expect(r).toBeGreaterThan(0.9);
        expect(g).toBeLessThan(0.1);
        expect(b).toBeLessThan(0.1);
      }
      {
        const [r] = readPixel(surface, 20, 20);
        expect(r).toBeGreaterThan(0.9);
      }

      // Ring band inside the sweep (off the segment seam at y=44).
      {
        const [r, g] = readPixel(surface, 54, 40);
        expect(g).toBeGreaterThan(0.5);
        expect(r).toBeLessThan(0.2);
      }

      // Ring band outside the sweep — clear.
      {
        const [r, g, b] = readPixel(surface, 34, 44);
        expect(r).toBeLessThan(0.1);
        expect(g).toBeLessThan(0.1);
        expect(b).toBeLessThan(0.1);
      }

      // Ring hole — clear.
      {
        const [r, g, b] = readPixel(surface, 44, 44);
        expect(r).toBeLessThan(0.1);
        expect(g).toBeLessThan(0.1);
        expect(b).toBeLessThan(0.1);
      }

      sdl.SDL_DestroySurface({ surface });
      gpu.destroy();
    }
  );
});

// describe() only registers — cleanup must wait for the tests to run.
afterAll(() => {
  if (window) {
    sdl.SDL_DestroyWindow({ window });
    sdl.SDL_Quit();
  }
});
