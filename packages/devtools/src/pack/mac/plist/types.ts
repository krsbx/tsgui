export type PlistJson<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};

export type Plist<T extends Record<string, unknown>> = PlistJson<T> & {
  toJson(): string;
  toString(): string;
};
