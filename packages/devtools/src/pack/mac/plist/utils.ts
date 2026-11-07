const increment = 2;

function toPlist<T>(obj: T, indent: number = 0): string {
  if (obj == null) return "";

  if (typeof obj === "function" || typeof obj === "symbol") return "";

  if (typeof obj === "string" || typeof obj === "number") {
    return `${" ".repeat(indent)}<string>${obj}</string>\n`;
  }

  if (typeof obj === "boolean") {
    return `${" ".repeat(indent)}<${obj.toString()} />\n`;
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);

    if (!entries.length) return "";

    const currIndent = indent;
    const nextIndent = indent + increment;

    let xml = "";

    for (const [key, value] of entries) {
      if (value == null) {
        xml += `${" ".repeat(currIndent)}<key>${key}</key>\n`;
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        xml += `${" ".repeat(currIndent)}<key>${key}</key>\n`;
        xml += toPlist(value, currIndent);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          xml += `${" ".repeat(currIndent)}<key>${key}</key>\n`;

          if (typeof v === "object" && v !== null) {
            xml += `${" ".repeat(currIndent)}<dict>\n`;
            xml += toPlist(v, nextIndent + increment);
            xml += `${" ".repeat(currIndent)}</dict>\n`;
          } else {
            xml += `${" ".repeat(currIndent)}<array>\n`;
            xml += toPlist(v, nextIndent);
            xml += `${" ".repeat(currIndent)}</array>\n`;
          }
        }
      } else if (typeof value === "object") {
        xml += `${" ".repeat(currIndent)}<key>${key}</key>\n`;
        xml += `${" ".repeat(currIndent)}<dict>\n`;
        xml += toPlist(value, nextIndent + 2);
        xml += `${" ".repeat(currIndent)}</dict>\n`;
      }
    }

    return xml;
  }

  return "";
}

export function convertToPlist<T extends Record<string, unknown>>(
  obj: T
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
  xml += '<plist version="1.0">\n';
  xml += `${" ".repeat(2)}<dict>\n`;
  xml += toPlist(obj, 4);
  xml += `${" ".repeat(2)}</dict>\n`;
  xml += "</plist>";

  return xml;
}
