/** Main-axis measurement updates — ported from flying-pan's layout/utility. */
import { crossMargin, mainMargin, mainSize } from "./axis.ts";
import { distributeFreeSpace, distributeShrinking } from "./calculator.ts";
import type {
  UpdateChildMeasurementsOptions,
  UpdateChildMeasurementsResult,
} from "./types.ts";
import { clamp, resolveConstraint } from "./style-resolve.ts";

export function updateChildMeasurements(
  options: UpdateChildMeasurementsOptions
): UpdateChildMeasurementsResult {
  const { isRow } = options;
  const totalGaps =
    options.measurements.length > 1
      ? options.gap * (options.measurements.length - 1)
      : 0;
  const mainAxisSize = isRow ? options.contentWidth : options.contentHeight;
  let fixedMainSize = totalGaps;
  let totalFlex = 0;

  for (const m of options.measurements) {
    if (m.flex > 0) {
      totalFlex += m.flex;
    } else {
      fixedMainSize += mainSize(m, isRow) + mainMargin(m, isRow);
    }
  }

  const freeSpace = mainAxisSize - fixedMainSize;

  if (freeSpace < 0) {
    distributeShrinking({
      measurements: options.measurements,
      totalFlex,
      freeSpace,
      isRow,
    });
  } else if (totalFlex > 0) {
    distributeFreeSpace({
      measurements: options.measurements,
      totalFlex,
      freeSpace,
      isRow,
    });
  }

  const crossAxisSize = isRow ? options.contentHeight : options.contentWidth;

  let totalMainSize = totalGaps;

  // Fused: main-axis clamp + cross-axis fill/clamp + totalMainSize accumulation
  for (const m of options.measurements) {
    const style = m.widget.style;

    const widthBounds = {
      min: resolveConstraint(style?.minWidth, options.contentWidth),
      max: resolveConstraint(style?.maxWidth, options.contentWidth),
    };
    const heightBounds = {
      min: resolveConstraint(style?.minHeight, options.contentHeight),
      max: resolveConstraint(style?.maxHeight, options.contentHeight),
    };

    // Main-axis clamp
    if (isRow) {
      m.width = clamp({ value: m.width, ...widthBounds });
    } else {
      m.height = clamp({ value: m.height, ...heightBounds });
    }

    // Cross-axis fill + clamp
    const crossSize = crossAxisSize - crossMargin(m, isRow);

    if (isRow) {
      if (!m.height) {
        m.height = crossSize;
      }
      m.height = clamp({ value: m.height, ...heightBounds });
    } else {
      if (!m.width) {
        m.width = crossSize;
      }
      m.width = clamp({ value: m.width, ...widthBounds });
    }

    totalMainSize += mainSize(m, isRow) + mainMargin(m, isRow);
  }

  return {
    crossAxisSize,
    mainAxisSize,
    totalGaps,
    totalMainSize,
  };
}
