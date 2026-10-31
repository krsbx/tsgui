/**
 * Pixel-readback guard — the op-count selftests can't see pixels, and this
 * is exactly where the SDL_Vertex ABI regression hid (garbage float colors
 * drew nothing while every call returned success).
 *
 * Runs against the software driver so readback is deterministic; skipped
 * when there is no display (headless CI).
 */
import { sdl, SdlDefines, sdlRaw } from "@tsgui/bindings";
import { afterAll, describe, expect, test } from "bun:test";
import { GpuRenderer, rgba } from "../src/index.ts";

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

      gpu.flush();

      const rect = new Int32Array([0, 0, 64, 64]);
      const surface = sdlRaw.SDL_RenderReadPixels(gpu.renderer, rect);
      if (!surface)
        throw new Error(`SDL_RenderReadPixels: ${sdlRaw.SDL_GetError()}`);

      const readPixel = (
        x: number,
        y: number
      ): [number, number, number, number] => {
        const r = new Float32Array(1);
        const g = new Float32Array(1);
        const b = new Float32Array(1);
        const a = new Float32Array(1);
        if (!sdlRaw.SDL_ReadSurfacePixelFloat(surface, x, y, r, g, b, a)) {
          throw new Error(
            `SDL_ReadSurfacePixelFloat(${x},${y}): ${sdlRaw.SDL_GetError()}`
          );
        }
        return [r[0]!, g[0]!, b[0]!, a[0]!];
      };

      // Inside the red square.
      {
        const [r, g, b, a] = readPixel(40, 40);
        expect(r).toBeGreaterThan(0.9);
        expect(g).toBeLessThan(0.1);
        expect(b).toBeLessThan(0.1);
        expect(a).toBeGreaterThan(0.9);
      }

      // Inside the rounded rect (away from red's overlap).
      {
        const [r, g, b] = readPixel(10, 10);
        expect(g).toBeGreaterThan(0.5);
        expect(r).toBeLessThan(0.2);
        expect(b).toBeLessThan(0.2);
      }

      // Rounded corner is cut away — clear color shows through.
      {
        const [r, g, b] = readPixel(5, 5);
        expect(b).toBeGreaterThan(r);
        expect(b).toBeGreaterThan(g);
        expect(r).toBeLessThan(0.3);
      }

      // Plain clear background bottom-left.
      {
        const [r, g, b] = readPixel(5, 60);
        expect(b).toBeGreaterThan(r);
        expect(b).toBeGreaterThan(g);
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
