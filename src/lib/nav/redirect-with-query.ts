import { redirect } from "next/navigation";

/** First string value from Next.js searchParams entry. */
export function pickSearchParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/**
 * Redirect to `base`, preserving query keys except `tab`
 * (legacy form `?tab=history|analytics` → /lich-su|/thong-ke).
 */
export function redirectWithQuery(
  base: string,
  params: Record<string, string | string[] | undefined>,
): never {
  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (key === "tab") continue;
    const val = pickSearchParam(raw);
    if (val) q.set(key, val);
  }
  const qs = q.toString();
  redirect(qs ? `${base}?${qs}` : base);
}
