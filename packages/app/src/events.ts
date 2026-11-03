/**
 * SDL event decoding — the raw byte-offset knowledge from the examples,
 * owned once here and routed by window. SDL3's common event prefix is
 * `type u32 @0, reserved u32 @4, timestamp u64 @8, windowID u32 @16`;
 * every payload offset below sits after that prefix (keyboard
 * scancode@24, text pointer@24, wheel scroll@24, motion x@28, button
 * u8@24 — the offsets the gallery proved against real events).
 */
import { EventType, readCString, Scancode, SdlDefines } from "@vulcania/bindings";
import {
  KeyModifiers,
  type KeyModifiers as KeyModifiersType,
} from "@vulcania/core";
import type { MouseButton } from "@vulcania/core";
import {
  type KeyboardInputEvent,
  KeyboardInputKind,
  type PointerInputEvent,
  PointerInputKind,
  type WheelInputEvent,
} from "@vulcania/interactions";

/** One SDL_EVENT_WINDOW_CLOSE_REQUESTED — route by windowId. */
export interface CloseRequest {
  windowId: number;
}

export interface DecodedEvents {
  /** Root-window close or quit — stop the app. */
  quit: boolean;
  /** Esc pressed (any window) — quit when quitOnEscape. */
  escape: boolean;
  closeRequests: CloseRequest[];
  pointerEvents: (PointerInputEvent & { windowId: number })[];
  keyboardEvents: (KeyboardInputEvent & { windowId: number })[];
  wheelEvents: (WheelInputEvent & { windowId: number })[];
}

const EVENT_BUFFER_BYTES = 256;

export class EventDecoder {
  private readonly buffer = new Uint8Array(EVENT_BUFFER_BYTES);
  private readonly view = new DataView(this.buffer.buffer);

  /** Poll SDL once into this decoder's buffer and decode the event. */
  public decode(poll: () => boolean): DecodedEvents {
    const out: DecodedEvents = {
      quit: false,
      escape: false,
      closeRequests: [],
      pointerEvents: [],
      keyboardEvents: [],
      wheelEvents: [],
    };

    while (poll()) {
      const view = this.view;
      const type = view.getUint32(0, true);
      const windowId = view.getUint32(16, true);

      if (type === EventType.SDL_EVENT_QUIT) out.quit = true;

      if (type === EventType.SDL_EVENT_WINDOW_CLOSE_REQUESTED) {
        out.closeRequests.push({ windowId });
      }

      if (
        type === EventType.SDL_EVENT_KEY_DOWN ||
        type === EventType.SDL_EVENT_KEY_UP
      ) {
        // SDL_KeyboardEvent: windowID@16, which@20, scancode@24,
        // keycode@28, mod@32, repeat@39.
        if (
          type === EventType.SDL_EVENT_KEY_DOWN &&
          view.getUint32(24, true) === Scancode.SDL_SCANCODE_ESCAPE
        ) {
          out.escape = true;
        }

        const mod = view.getUint32(32, true);
        // SDL_KMOD shift/ctrl/gui variants collapse to the toolkit bits.
        out.keyboardEvents.push({
          kind:
            type === EventType.SDL_EVENT_KEY_DOWN
              ? KeyboardInputKind.KeyDown
              : KeyboardInputKind.KeyUp,
          key: view.getUint32(28, true),
          modifiers: (((mod &
            (SdlDefines.SDL_KMOD_LSHIFT | SdlDefines.SDL_KMOD_RSHIFT)) !==
          0
            ? KeyModifiers.Shift
            : 0) |
            ((mod & (SdlDefines.SDL_KMOD_LCTRL | SdlDefines.SDL_KMOD_RCTRL)) !==
            0
              ? KeyModifiers.Control
              : 0) |
            ((mod & (SdlDefines.SDL_KMOD_LGUI | SdlDefines.SDL_KMOD_RGUI)) !== 0
              ? KeyModifiers.Meta
              : 0)) as KeyModifiersType,
          repeat: view.getUint8(39) !== 0,
          windowId,
        });
      }

      if (type === EventType.SDL_EVENT_TEXT_INPUT) {
        // SDL_TextInputEvent: const char *text @ 24 — NUL-terminated.
        const textPtr = view.getBigUint64(24, true);
        const text = readCString(textPtr);
        if (text) {
          out.keyboardEvents.push({
            kind: KeyboardInputKind.Char,
            key: 0,
            text,
            modifiers: 0,
            windowId,
          });
        }
      }

      if (type === EventType.SDL_EVENT_MOUSE_WHEEL) {
        out.wheelEvents.push({
          scrollX: view.getFloat32(24, true),
          scrollY: view.getFloat32(28, true),
          mouseX: view.getFloat32(36, true),
          mouseY: view.getFloat32(40, true),
          windowId,
        });
      }

      if (type === EventType.SDL_EVENT_MOUSE_MOTION) {
        out.pointerEvents.push({
          kind: PointerInputKind.Move,
          x: view.getFloat32(28, true),
          y: view.getFloat32(32, true),
          windowId,
        });
      }

      if (
        (type === EventType.SDL_EVENT_MOUSE_BUTTON_DOWN ||
          type === EventType.SDL_EVENT_MOUSE_BUTTON_UP) &&
        view.getUint8(24) > 0
      ) {
        out.pointerEvents.push({
          kind:
            type === EventType.SDL_EVENT_MOUSE_BUTTON_DOWN
              ? PointerInputKind.Down
              : PointerInputKind.Up,
          x: view.getFloat32(28, true),
          y: view.getFloat32(32, true),
          button: view.getUint8(24) as MouseButton,
          windowId,
        });
      }
    }

    return out;
  }

  /** The raw buffer handed to SDL_PollEvent. */
  public get data(): Uint8Array {
    return this.buffer;
  }
}
