export type TomlJson<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};

export type Toml<T extends Record<string, unknown>> = TomlJson<T> & {
  toJson(): string;
  toString(): string;
};
