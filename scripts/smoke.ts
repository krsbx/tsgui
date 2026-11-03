/**
 * Headless smoke test — loads every native binding and verifies each
 * library reports a version, without opening a window. Runs on Bun and
 * Node.
 *
 *   bun run smoke        (bun:ffi backend)
 *   bun run smoke:node   (node:ffi backend, Node >= 26.9)
 */
import { image, mixer, runtime, sdl, ttf } from "@vulcania/bindings";

/** SDL3 encodes versions as major*1_000_000 + minor*1_000 + patch. */
function decode(v: number): string {
  const major = Math.floor(v / 1_000_000);
  const minor = Math.floor(v / 1_000) % 1_000;
  const patch = v % 1_000;
  return `${major}.${minor}.${patch}`;
}

const sdlVersion = decode(sdl.SDL_GetVersion());
if (!sdlVersion.startsWith("3")) {
  throw new Error(`smoke: expected SDL3, found ${sdlVersion}`);
}

const versions: Record<string, string> = {
  sdl: sdlVersion,
  image: decode(image.IMG_Version()),
  ttf: decode(ttf.TTF_Version()),
  mixer: decode(mixer.MIX_Version()),
};

for (const [lib, version] of Object.entries(versions)) {
  if (version.startsWith("0.") || version === "0.0.0") {
    throw new Error(`smoke: ${lib} reported no version (${version})`);
  }
}

console.log(
  `smoke: runtime=${runtime}, ` +
    Object.entries(versions)
      .map(([lib, v]) => `${lib} ${v}`)
      .join(", ") +
    " — ok"
);
