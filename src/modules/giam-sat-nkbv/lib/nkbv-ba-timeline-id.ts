/** UI merge gắn prefix `manual:` — strip trước khi ghi DB. Từ chối lis:/dev-*. */
export function normalizeBaTimelineDbId(raw: string | undefined | null): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (s.startsWith("lis:") || s.startsWith("dev-")) return null;
  if (s.startsWith("manual:")) return s.slice("manual:".length) || null;
  if (s.startsWith("local-")) return null;
  return s;
}
