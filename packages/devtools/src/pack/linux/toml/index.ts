import type { Toml as TomlInstance } from "./types.ts";
import { convertToToml } from "./utils";

interface TomlConstrutor {
  new <T extends Record<string, unknown>>(json: T): TomlInstance<T>;
  readonly prototype: TomlInstance<Record<string, unknown>>;
}

const Toml = function Toml<T extends Record<string, unknown>>(
  this: TomlInstance<T>,
  json: T
) {
  if (!new.target) throw new TypeError("Toml must be called with `new`");
  Object.assign(this, json);
} as unknown as TomlConstrutor;

// Methods live on the prototype (shared, non-enumerable via defineProperties),
// so they don't show up in Object.entries(this) during serialization.
Object.defineProperties(Toml.prototype, {
  toString: {
    value(this: Record<string, unknown>): string {
      return convertToToml(this);
    },
    writable: true,
    configurable: true,
  },
  toJson: {
    value(this: TomlInstance<Record<string, unknown>>): string {
      return this.toString();
    },
    writable: true,
    configurable: true,
  },
  [Symbol.for("nodejs.util.inspect.custom")]: {
    value(this: TomlInstance<Record<string, unknown>>): string {
      return this.toString();
    },
    writable: true,
    configurable: true,
  },
});

export { Toml };
