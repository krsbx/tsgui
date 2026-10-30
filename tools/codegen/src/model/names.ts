/** Naming helpers shared by the model layer. */

export function camelize(s: string): string {
  return s.replace(/_+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function pascalCase(s: string): string {
  const c = camelize(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** Strip the target's symbol prefix from a declaration name ("SDL_Foo" → "Foo"). */
export function stripPrefix(name: string, prefix: string): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return name.replace(new RegExp(`^${escaped}`), '');
}
