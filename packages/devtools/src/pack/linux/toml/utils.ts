function isTable(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function isArrayOfTables(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && value.every(isTable);
}

function skippable(value: unknown): boolean {
  return (
    value == null || typeof value === "function" || typeof value === "symbol"
  );
}

function formatString(value: string): string {
  // eslint-disable-next-line no-control-regex -- control chars must be escaped in TOML strings
  const escaped = value.replace(/[\\"\u0000-\u001f\u007f]/g, (ch) => {
    switch (ch) {
      case "\\":
        return "\\\\";

      case '"':
        return '\\"';

      case "\b":
        return "\\b";

      case "\t":
        return "\\t";

      case "\n":
        return "\\n";

      case "\f":
        return "\\f";

      case "\r":
        return "\\r";

      default:
        return `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
    }
  });

  return `"${escaped}"`;
}

function formatKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : formatString(key);
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return formatString(value);
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "bigint") return value.toString();

  if (typeof value === "number") {
    if (Number.isNaN(value)) return "nan";
    if (value === Infinity) return "inf";
    if (value === -Infinity) return "-inf";
    return value.toString();
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const items = value.filter((v) => !skippable(v)).map(formatValue);
    return `[${items.join(", ")}]`;
  }

  if (isTable(value)) {
    const pairs = Object.entries(value)
      .filter(([, v]) => !skippable(v))
      .map(([k, v]) => `${formatKey(k)} = ${formatValue(v)}`);
    return pairs.length ? `{ ${pairs.join(", ")} }` : "{}";
  }

  return formatString(String(value));
}

function toToml<T extends Record<string, unknown>>(
  obj: T,
  path: string[] = []
): string {
  const entries = Object.entries(obj).filter(([, value]) => !skippable(value));

  let toml = "";

  for (const [key, value] of entries) {
    if (isTable(value) || isArrayOfTables(value)) continue;
    toml += `${formatKey(key)}=${formatValue(value)}\n`;
  }

  for (const [key, value] of entries) {
    const header = [...path, formatKey(key)];

    if (isTable(value)) {
      toml += `[${header.join(".")}]\n`;
      toml += toToml(value, header);
    } else if (isArrayOfTables(value)) {
      for (const item of value) {
        toml += `[[${header.join(".")}]]\n`;
        toml += toToml(item, header);
      }
    }
  }

  return toml;
}

export function convertToToml<T extends Record<string, unknown>>(
  obj: T
): string {
  return toToml(obj);
}
