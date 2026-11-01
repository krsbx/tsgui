/**
 * @tsgui/app — the application shell: the multi-window App (SDL init,
 * window registry, event decode + window routing, the run loop) and the
 * per-window toolkit stack (renderer, font, reconciler, state,
 * dispatchers, animation). The top layer: consumes every other package;
 * examples hand it per-frame tree assignments, not SDL byte offsets.
 */
export { App, type AppOptions } from "./app.ts";
export { AppWindow, type AppWindowOptions } from "./window.ts";
export {
  EventDecoder,
  type DecodedEvents,
  type CloseRequest,
} from "./events.ts";
