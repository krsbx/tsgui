/** Child measurement + wrap + justify calculation — ported from flying-pan. */
import type { WidgetDescriptor } from "./style.ts";
import { clamp, resolveSize, resolveSpacing } from "./style-resolve.ts";
import { FlexAlign, FlexJustify, Position, SpacingType } from "./enums.ts";
import type {
  CalculateMainContentSizeOptions,
  CalculateMainContentSizeResult,
  ChildMeasurements,
  MeasureChildsComponentOptions,
  MeasureChildsComponentResult,
  WrapLine,
  WrapMeasurementsOptions,
} from "./types.ts";
import { resolveChildSize } from "./resolver.ts";

export function measureChildsComponent(
  options: MeasureChildsComponentOptions
): MeasureChildsComponentResult {
  const { parentWidth, parentHeight } = options;
  const flow: ChildMeasurements[] = [];
  const absolute: ChildMeasurements[] = [];
  let maxH = 0;
  let sumH = 0;
  let maxW = 0;
  let sumW = 0;

  for (const child of options.children) {
    const margin = resolveSpacing(child.style?.[SpacingType.Margin], parentWidth);
    const isAbsolute = child.style?.position === Position.Absolute;
    const flexValue = child.style?.flexGrow ?? child.style?.flex ?? 0;
    const flexShrinkValue = child.style?.flexShrink ?? (child.style?.flex ? 1 : 0);

    const flex = isAbsolute ? 0 : flexValue;
    const flexShrink = isAbsolute ? 0 : flexShrinkValue;

    let { height, width } = resolveChildSize({
      ctx: options.ctx,
      widget: child,
      parentHeight,
      parentWidth,
    });

    width = clamp({
      value: width,
      min: child.style?.minWidth != null ? resolveSize(child.style.minWidth, parentWidth) : null,
      max: child.style?.maxWidth != null ? resolveSize(child.style.maxWidth, parentWidth) : null,
    });
    height = clamp({
      value: height,
      min: child.style?.minHeight != null ? resolveSize(child.style.minHeight, parentHeight) : null,
      max: child.style?.maxHeight != null ? resolveSize(child.style.maxHeight, parentHeight) : null,
    });

    const measurement: ChildMeasurements = {
      widget: child,
      flex,
      flexShrink,
      margin,
      height,
      width,
    };

    if (isAbsolute) {
      absolute.push(measurement);
    } else {
      const h = height + margin.top + margin.bottom;
      const w = width + margin.left + margin.right;

      maxH = Math.max(maxH, h);
      sumH += h;
      maxW = Math.max(maxW, w);
      sumW += w;

      flow.push(measurement);
    }
  }

  return { flow, absolute, maxH, sumH, maxW, sumW };
}

export function wrapMeasurements(options: WrapMeasurementsOptions): WrapLine[] {
  const lines: WrapLine[] = [];
  let currentLine: ChildMeasurements[] = [];
  let currentMain = 0;

  for (const m of options.measurements) {
    const mainSize = options.isRow ? m.width : m.height;
    const mainMargin = options.isRow
      ? m.margin.left + m.margin.right
      : m.margin.top + m.margin.bottom;
    const spaceRequired = mainSize + mainMargin;
    const gapRequired = currentLine.length > 0 ? options.gap : 0;

    if (
      currentLine.length > 0 &&
      currentMain + gapRequired + spaceRequired > options.mainAxisSize
    ) {
      lines.push({ measurements: currentLine, crossSize: 0 });
      currentLine = [];
      currentMain = 0;
    }

    currentLine.push(m);
    currentMain += spaceRequired + gapRequired;
  }

  if (currentLine.length > 0) {
    lines.push({ measurements: currentLine, crossSize: 0 });
  }

  for (const line of lines) {
    line.crossSize = Math.max(
      ...line.measurements.map((m) => {
        const margin = options.isRow
          ? m.margin.top + m.margin.bottom
          : m.margin.left + m.margin.right;

        return options.isRow ? m.height + margin : m.width + margin;
      })
    );
  }

  return lines;
}

export function calculateMainContentSize(
  options: CalculateMainContentSizeOptions
): CalculateMainContentSizeResult {
  let mainPos = options.isRow ? options.padding.left : options.padding.top;
  const justifyItems = options.style?.justifyContent ?? FlexJustify.Start;
  const alignItems = options.style?.alignItems ?? FlexAlign.Stretch;

  const freeSpace = options.mainAxisSize - options.totalMainSize;
  let spaceBetweenGap = 0;
  let spaceEvenlyGap = 0;

  switch (justifyItems) {
    case FlexJustify.Center:
      mainPos += freeSpace / 2;
      break;
    case FlexJustify.End:
      mainPos += freeSpace;
      break;
    case FlexJustify.SpaceBetween:
      if (options.measurements.length > 1) {
        spaceBetweenGap = freeSpace / (options.measurements.length - 1);
      }
      break;
    case FlexJustify.SpaceEvenly:
      spaceEvenlyGap = freeSpace / (options.measurements.length + 1);
      mainPos += spaceEvenlyGap;
      break;
  }

  return { spaceBetweenGap, spaceEvenlyGap, alignItems, justifyItems, mainPos };
}

export type { WidgetDescriptor };
