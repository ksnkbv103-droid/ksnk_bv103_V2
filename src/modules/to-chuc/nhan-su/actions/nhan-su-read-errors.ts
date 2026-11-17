export function errNhanSu(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
