/** Resolve dotted object paths (e.g. `a.b.c`) for table filter/sort. */
export function getByPath(obj: unknown, path: string): unknown {
  if (obj == null || path === "") return undefined;
  if (!path.includes(".")) {
    return (obj as Record<string, unknown>)[path];
  }
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}
