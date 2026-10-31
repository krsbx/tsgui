/** Child measurement + wrap + justify calculation — ported from flying-pan. */
import { crossMargin, mainMargin, mainSize } from "./axis.ts";
import {
  FlexAlign,
  FlexDirection,
  FlexJustify,
  Position,
  SpacingType,
} from "./enums.ts";
import { resolveChildSize } from "./resolver.ts";
import {
  clamp,
  resolveConstraint,
  resolveSize,
  resolveSpacing,
} from "./style-resolve.ts";
import type { Size, WidgetDescriptor } from "./style.ts";
import type {
  CalculateMainContentSizeOptions,
  CalculateMainContentSizeResult,
  ChildMeasurements,
  MeasureChildsComponentOptions,
  MeasureChildsComponentResult,
  WrapLine,
  WrapMeasurementsOptions,
} from "./types.ts";
import type { LayoutContext } from "./types.ts";

/**
 * Intrinsic size of a widget, recursing into auto-sized containers — the
 * web intrinsic-sizing model. A container without explicit dimensions is
 * as big as its content, computed bottom-up BEFORE positioning; without
 * this, a nested auto container measures 0 and its siblings overlap it.
 *
 * Leaves resolve through {@link resolveChildSize} (style + per-widget
 * intrinsic resolution); containers fill missing dimensions from their
 * flow children (main axis sums + gaps, cross axis takes the largest),
 * plus their own padding. Absolute children are excluded, and
 * grow/shrink distribution is ignored — intrinsic size is the
 * pre-flex content size, matching CSS min-content behavior.
 */
function intrinsicSize(options: {
  widget: WidgetDescriptor;
  ctx: LayoutContext;
  parentWidth: number;
  parentHeight: number;
}): Size {
  const { widget, ctx, parentWidth, parentHeight } = options;
  const size = resolveChildSize({ widget, ctx, parentWidth, parentHeight });

  const needsWidth = size.width === 0;
  const needsHeight = size.height === 0;
  if ((!needsWidth && !needsHeight) || widget.children === undefined) {
    return size;
  }

  const style = widget.style ?? {};
  const isRow = style.flexDirection !== FlexDirection.Column;
  const padding = resolveSpacing(style.padding, parentWidth);
  const gap = resolveSize(style.gap, size.width || parentWidth);

  let maxH = 0;
  let sumH = 0;
  let maxW = 0;
  let sumW = 0;
  let flowCount = 0;

  for (const child of widget.children) {
    if (child.style?.position === Position.Absolute) continue;
    flowCount++;

    const childSize = intrinsicSize({
      widget: child,
      ctx,
      parentWidth: size.width || parentWidth,
      parentHeight: size.height || parentHeight,
    });
    const margin = resolveSpacing(
      child.style?.[SpacingType.Margin],
      parentWidth
    );

    const h = childSize.height + margin.top + margin.bottom;
    const w = childSize.width + margin.left + margin.right;
    maxH = Math.max(maxH, h);
    sumH += h;
    maxW = Math.max(maxW, w);
    sumW += w;
  }

  if (flowCount === 0) return size;

  const gaps = flowCount > 1 ? gap * (flowCount - 1) : 0;
  if (needsHeight) {
    size.height = (isRow ? maxH : sumH + gaps) + padding.top + padding.bottom;
  }
  if (needsWidth) {
    size.width = (isRow ? sumW + gaps : maxW) + padding.left + padding.right;
  }

  return size;
}

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
    const margin = resolveSpacing(
      child.style?.[SpacingType.Margin],
      parentWidth
    );
    const isAbsolute = child.style?.position === Position.Absolute;
    const flexValue = child.style?.flexGrow ?? child.style?.flex ?? 0;
    const flexShrinkValue =
      child.style?.flexShrink ?? (child.style?.flex ? 1 : 0);

    const flex = isAbsolute ? 0 : flexValue;
    const flexShrink = isAbsolute ? 0 : flexShrinkValue;

    let { height, width } = intrinsicSize({
      widget: child,
      ctx: options.ctx,
      parentHeight,
      parentWidth,
    });

    width = clamp({
      value: width,
      min: resolveConstraint(child.style?.minWidth, parentWidth),
      max: resolveConstraint(child.style?.maxWidth, parentWidth),
    });
    height = clamp({
      value: height,
      min: resolveConstraint(child.style?.minHeight, parentHeight),
      max: resolveConstraint(child.style?.maxHeight, parentHeight),
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
    const spaceRequired =
      mainSize(m, options.isRow) + mainMargin(m, options.isRow);
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
      ...line.measurements.map(
        (m) =>
          (options.isRow ? m.height : m.width) + crossMargin(m, options.isRow)
      )
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
