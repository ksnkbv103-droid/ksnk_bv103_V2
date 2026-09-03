/**
 * BK-4: cùng một phiếu → cùng bộ câu (mở sửa / in / xem).
 * Có ảnh chốt BK-1 thì dùng nguyên. Phiếu cũ chưa chốt: chỉ câu đã ghi trên phiếu,
 * không thêm câu mới đang bật trên mẫu sống.
 */

import { activeSortedTieuChiJsonb, type GscBangKiemSnapshot } from "./gsc-bang-kiem-snapshot";
import type { TieuChiJsonbRaw } from "./gsc-form-template-sync";

export function scoredCriterionIdsFromGscResults(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = String(o.criterion_id ?? o.criterionId ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function pickTieuChiJsonbForGscSession(opts: {
  frozen: GscBangKiemSnapshot | null;
  live: TieuChiJsonbRaw[];
  scoredCriterionIds: readonly string[];
}): TieuChiJsonbRaw[] {
  if (opts.frozen) {
    return Array.isArray(opts.frozen.tieu_chi_jsonb) ? opts.frozen.tieu_chi_jsonb : [];
  }

  const scored = opts.scoredCriterionIds.map((id) => String(id || "").trim()).filter(Boolean);
  if (scored.length === 0) {
    return activeSortedTieuChiJsonb(opts.live);
  }

  const liveById = new Map(
    (opts.live || []).filter((t) => t && t.id).map((t) => [String(t.id), t] as const),
  );
  const out: TieuChiJsonbRaw[] = [];
  for (const id of scored) {
    const live = liveById.get(id);
    if (live) {
      out.push(live);
      continue;
    }
    out.push({
      id,
      noi_dung: "Tiêu chí đã chấm (không còn trên mẫu)",
      stt: 9999,
    });
  }
  return out.sort((a, b) => (Number(a.stt) || 0) - (Number(b.stt) || 0));
}
