/**
 * Options khoa cho SearchableSelect (pattern GSC: tìm mã + tên).
 */

import type { SearchableSelectOption } from "@/components/shared/SearchableSelect";

export type NkbvKhoaOpt = {
  id: string;
  ten_danh_muc?: string | null;
  ma_danh_muc?: string | null;
};

export function nkbvKhoaSelectOptions(khoas: NkbvKhoaOpt[]): SearchableSelectOption[] {
  return (khoas || []).map((k) => {
    const ma = String(k.ma_danh_muc || "").trim();
    const ten = String(k.ten_danh_muc || "").trim();
    const label = ma && ten ? `${ma} — ${ten}` : ten || ma || k.id;
    return {
      id: String(k.id),
      label,
      keywords: [ma, ten, k.id].filter(Boolean) as string[],
    };
  });
}

export function nkbvKhoaDisplayName(
  khoaId: string | null | undefined,
  khoas: NkbvKhoaOpt[],
): string | null {
  if (!khoaId) return null;
  const k = khoas.find((x) => x.id === khoaId);
  if (!k) return null;
  const ma = String(k.ma_danh_muc || "").trim();
  const ten = String(k.ten_danh_muc || "").trim();
  if (ma && ten) return `${ma} — ${ten}`;
  return ten || ma || null;
}
