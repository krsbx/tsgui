/** CLI report formatting for FFI-safety exclusions. */
import type { FfiTables } from '../model';

/** Used by the pipeline report so missing capabilities are visible, not silent. */
export function summarizeUnsafe(tables: FfiTables, limit = 20): string {
  if (tables.unsafe.length === 0) return '';
  const samples = tables.unsafe
    .slice(0, limit)
    .map((u) => `  ${u.name}: ${u.reason}`)
    .join('\n');
  const more =
    tables.unsafe.length > limit
      ? `\n  … and ${tables.unsafe.length - limit} more`
      : '';
  return `\nFFI-unsafe (excluded): ${tables.unsafe.length}\n${samples}${more}`;
}
