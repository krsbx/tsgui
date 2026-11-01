/** Naming helpers shared by the model layer. */

export function camelize(s: string): string {
  return s.replace(/_+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function pascalCase(s: string): string {
  const c = camelize(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/**
 * Strip the target's symbol prefix from a declaration name ("SDL_Foo" → "Foo").
 * The longest matching prefix wins, so "SDL_TTF_X" with ["SDL_", "SDL_TTF_"]
 * gives "X", not "TTF_X".
 */
export function stripPrefix(name: string, prefixes: string[]): string {
  const match = prefixes
    .filter((p) => name.startsWith(p))
    .reduce((a, b) => (b.length > a.length ? b : a), "");
  return name.slice(match.length);
}
