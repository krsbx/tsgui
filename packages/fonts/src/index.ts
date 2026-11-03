/**
 * @vulcania/fonts — the font registry: named fonts (path + point size
 * descriptors) materialized per renderer as TtfFont instances.
 * "default" is a registered identifier convention, not a system
 * fallback. Depends only on @vulcania/gpu.
 */
export {
  FALLBACK_FONT_SIZE,
  fallbackFontPath,
  type FontDescriptor,
  FontManager,
  type WindowFonts,
} from "./fonts.ts";
