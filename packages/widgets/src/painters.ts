/**
 * The per-widget painter registry — what @tsgui/widgets contributes to
 * PaintContext.painters. Each painter is co-located with its widget
 * (<widget>/paint.ts); the engine (@tsgui/paint) stays widget-agnostic.
 */
import { WidgetType } from "@tsgui/layout";
import type { WidgetPainters } from "@tsgui/paint";
import { paintCheckbox } from "./widgets/checkbox/paint.ts";
import { paintImage } from "./widgets/image/paint.ts";
import { paintLabel } from "./widgets/label/paint.ts";
import { paintMeter } from "./widgets/meter/paint.ts";
import {
  paintCircularProgress,
  paintProgressBar,
} from "./widgets/progress/paint/index.ts";
import { paintRadio } from "./widgets/radio/paint.ts";
import { paintCircularSlider } from "./widgets/slider/circular-slider.ts";
import { paintSliderBar } from "./widgets/slider/slider-bar.ts";
import { paintTextArea } from "./widgets/text-area/paint.ts";
import { paintTextInput } from "./widgets/text-input/paint.ts";
import { paintToggle } from "./widgets/toggle/paint.ts";

export const widgetPainters: WidgetPainters = new Map([
  [WidgetType.Label, paintLabel],
  [WidgetType.Image, paintImage],
  [WidgetType.ProgressBar, paintProgressBar],
  [WidgetType.CircularProgress, paintCircularProgress],
  [WidgetType.Meter, paintMeter],
  [WidgetType.Checkbox, paintCheckbox],
  [WidgetType.Toggle, paintToggle],
  [WidgetType.Radio, paintRadio],
  [WidgetType.SliderBar, paintSliderBar],
  [WidgetType.CircularSlider, paintCircularSlider],
  [WidgetType.TextInput, paintTextInput],
  [WidgetType.TextArea, paintTextArea],
]);
