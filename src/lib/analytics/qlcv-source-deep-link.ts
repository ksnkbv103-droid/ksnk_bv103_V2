/**
 * Deep-link «Tạo việc KSNK» từ module nguồn (QLCV-12).
 * Hạn mặc định: không tự điền — người tạo nhập (N-QLCV-4 tạm).
 */

export type QlcvNguonModule = "CSSD_SU_CO" | "GIAM_SAT" | "NKBV" | "analytics";

export type QlcvNguonLienKet = {
  module: QlcvNguonModule;
  id?: string | null;
  ma?: string | null;
  label?: string | null;
  href?: string | null;
};

/** Chỉ path nội bộ bắt đầu `/` (không `//`, không scheme). */
export function isSafeInternalAppHref(href: string | null | undefined): boolean {
  const h = String(href ?? "").trim();
  if (!h.startsWith("/")) return false;
  if (h.startsWith("//")) return false;
  if (h.includes("\\")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return false;
  return true;
}

/** Trả về href nội bộ an toàn hoặc null (bỏ javascript:/http ngoài). */
export function sanitizeQlcvNguonHref(href: string | null | undefined): string | null {
  const h = String(href ?? "").trim();
  if (!h) return null;
  return isSafeInternalAppHref(h) ? h : null;
}

export function buildQlcvSourceDeepLink(opts: {
  from: Exclude<QlcvNguonModule, "analytics">;
  tieuDe: string;
  moTa?: string;
  sourceId?: string | null;
  sourceMa?: string | null;
  sourceLabel?: string | null;
  sourceHref?: string | null;
  openCreate?: boolean;
}): string {
  const q = new URLSearchParams();
  q.set("from", opts.from);
  q.set("topic", opts.tieuDe.slice(0, 180));
  if (opts.moTa?.trim()) q.set("gap", opts.moTa.trim().slice(0, 500));
  if (opts.sourceId?.trim()) q.set("source_id", opts.sourceId.trim());
  if (opts.sourceMa?.trim()) q.set("source_ma", opts.sourceMa.trim());
  if (opts.sourceLabel?.trim()) q.set("source_label", opts.sourceLabel.trim());
  const safeHref = sanitizeQlcvNguonHref(opts.sourceHref);
  if (safeHref) q.set("source_href", safeHref);
  if (opts.openCreate !== false) q.set("create", "1");
  return `/quan-ly-cong-viec?${q.toString()}`;
}

export function parseQlcvNguonFromSearchParams(sp: {
  get: (k: string) => string | null;
}): QlcvNguonLienKet | null {
  const from = sp.get("from")?.trim();
  if (!from) return null;
  if (from !== "CSSD_SU_CO" && from !== "GIAM_SAT" && from !== "NKBV" && from !== "analytics") {
    return null;
  }
  return {
    module: from,
    id: sp.get("source_id")?.trim() || null,
    ma: sp.get("source_ma")?.trim() || null,
    label: sp.get("source_label")?.trim() || null,
    href: sanitizeQlcvNguonHref(sp.get("source_href")),
  };
}

export function hrefForQlcvNguon(n: QlcvNguonLienKet | null | undefined): string | null {
  if (!n) return null;
  const safe = sanitizeQlcvNguonHref(n.href);
  if (safe) return safe;
  if (!n.id) return null;
  if (n.module === "CSSD_SU_CO") return `/cssd-su-co?id=${encodeURIComponent(n.id)}`;
  if (n.module === "GIAM_SAT") return `/giam-sat-chung?session=${encodeURIComponent(n.id)}`;
  if (n.module === "NKBV") return `/giam-sat-nkbv?id=${encodeURIComponent(n.id)}`;
  return null;
}
