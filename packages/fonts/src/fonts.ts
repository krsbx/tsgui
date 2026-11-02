/**
 * FontManager — named fonts with a "default" alias, ported from
 * flying-pan's app/fonts manager. The registry holds DESCRIPTORS
 * (path + point size); SDL3 scopes font texture caches per renderer,
 * so each window materializes its own TtfFont instances from the
 * shared descriptors via `materialize(renderer)`.
 *
 * "default" is nothing but a registered identifier convention — apps
 * load a specific font and alias it, exactly like flying-pan's docs
 * entry. When no "default" is registered, the built-in platform
 * fallback (TSGUI_FONT_PATH → system font at the fallback size) keeps
 * older apps working. Unknown names throw — fail-loud beats silent
 * fallback.
 */
import { type RendererHandle, TtfFont } from "@tsgui/gpu";

export interface FontDescriptor {
  path: string;
  size: number;
}

export interface WindowFonts {
  /** The "default" font — what widgets without a font name render in. */
  default: TtfFont;
  /** Look up a named font; throws on unknown names (fail-loud). */
  get(name: string): TtfFont;
  has(name: string): boolean;
  destroy(): void;
}

/** Fallback size for the built-in default font. */
export const FALLBACK_FONT_SIZE = 18;

/** Built-in fallback font — used only when no "default" is registered. */
export function fallbackFontPath(): string {
  const fromEnv = process.env.TSGUI_FONT_PATH;
  if (fromEnv) return fromEnv;
  if (process.platform === "darwin") {
    return "/System/Library/Fonts/Supplemental/Arial.ttf";
  }
  return "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
}

export class FontManager {
  private readonly descriptors: Record<string, FontDescriptor>;

  public constructor(descriptors: Record<string, FontDescriptor> = {}) {
    this.descriptors = descriptors;
  }

  public has(name: string): boolean {
    return name === "default" || name in this.descriptors;
  }

  /**
   * Build a window's font set: every registered descriptor becomes a
   * TtfFont on the window's renderer, and "default" resolves to the
   * registered entry or the built-in fallback.
   */
  public materialize(renderer: RendererHandle): WindowFonts {
    const fonts = new Map<string, TtfFont>();

    for (const [name, descriptor] of Object.entries(this.descriptors)) {
      fonts.set(name, new TtfFont(renderer, descriptor.path, descriptor.size));
    }

    if (!fonts.has("default")) {
      fonts.set(
        "default",
        new TtfFont(renderer, fallbackFontPath(), FALLBACK_FONT_SIZE)
      );
    }

    return {
      default: fonts.get("default")!,
      get(name: string): TtfFont {
        const font = fonts.get(name);
        if (!font) throw new Error(`[FontManager] Font not found: ${name}`);
        return font;
      },
      has(name: string): boolean {
        return fonts.has(name);
      },
      destroy(): void {
        for (const font of fonts.values()) font.destroy();
        fonts.clear();
      },
    };
  }
}
