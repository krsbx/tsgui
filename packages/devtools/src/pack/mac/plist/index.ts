import type { Plist as PlistInstance } from "./types.ts";
import { convertToPlist } from "./utils.ts";

interface PlistConstructor {
  new <T extends Record<string, unknown>>(json: T): PlistInstance<T>;
  readonly prototype: PlistInstance<Record<string, unknown>>;
}

const Plist = function Plist<T extends Record<string, unknown>>(
  this: PlistInstance<T>,
  json: T
) {
  if (!new.target) throw new TypeError("Plist must be called with `new`");
  Object.assign(this, json);
} as unknown as PlistConstructor;

// Methods live on the prototype (shared, non-enumerable via defineProperties),
// so they don't show up in Object.entries(this) during serialization.
Object.defineProperties(Plist.prototype, {
  toString: {
    value(this: Record<string, unknown>): string {
      return convertToPlist(this);
    },
    writable: true,
    configurable: true,
  },
  toJson: {
    value(this: PlistInstance<Record<string, unknown>>): string {
      return this.toString();
    },
    writable: true,
    configurable: true,
  },
  [Symbol.for("nodejs.util.inspect.custom")]: {
    value(this: PlistInstance<Record<string, unknown>>): string {
      return this.toString();
    },
    writable: true,
    configurable: true,
  },
});

export { Plist };
