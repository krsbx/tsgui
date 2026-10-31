/** Flex space distribution — ported verbatim from flying-pan's calculator. */
import { mainMargin } from "./axis.ts";
import type { DistributeChildOptions } from "./types.ts";

export function distributeFreeSpace(options: DistributeChildOptions): void {
  const flexUnit = options.freeSpace / options.totalFlex;

  for (const m of options.measurements) {
    if (!m.flex) continue;

    const size = m.flex * flexUnit - mainMargin(m, options.isRow);

    if (options.isRow) {
      m.width = size;
    } else {
      m.height = size;
    }
  }
}

export function distributeShrinking(options: DistributeChildOptions): void {
  let totalShrink = 0;

  for (const m of options.measurements) {
    if (m.flexShrink > 0) {
      totalShrink += m.flexShrink;
    }
  }

  if (totalShrink > 0) {
    const overflow = -options.freeSpace;

    for (const m of options.measurements) {
      if (m.flexShrink <= 0) continue;

      const shrinkAmount =
        (m.flexShrink / totalShrink) * overflow - mainMargin(m, options.isRow);

      if (options.isRow) {
        m.width = Math.max(0, m.width - shrinkAmount);
      } else {
        m.height = Math.max(0, m.height - shrinkAmount);
      }
    }
  }
}
