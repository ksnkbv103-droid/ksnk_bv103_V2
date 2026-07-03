/** Checklist PM seed theo mã loại máy — không bảng template DB. */

export type CssdPmChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

const DEFAULT_ITEMS: { id: string; label: string }[] = [
  { id: "vs", label: "Vệ sinh bề mặt / buồng thiết bị" },
  { id: "kiem", label: "Kiểm tra gioăng, van, phin lọc (nếu có)" },
  { id: "chay", label: "Chạy thử / test an toàn sau bảo dưỡng" },
];

const BY_LOAI_MAY: Record<string, { id: string; label: string }[]> = {
  LM_HOI_NUOC: [
    { id: "vs_buong", label: "Vệ sinh buồng tiệt khuẩn" },
    { id: "gioang", label: "Kiểm tra gioăng cửa, van an toàn" },
    { id: "test_ro", label: "Test rò / leak test (theo hướng dẫn NSX)" },
    { id: "chay_thu", label: "Chạy thử chu trình rỗng — đạt thông số" },
  ],
  LM_RUA_TU_DONG: [
    { id: "vs_khoang", label: "Vệ sinh khoang rửa, lưới, vòi phun" },
    { id: "loc", label: "Kiểm tra / thay lọc (nếu đến kỳ)" },
    { id: "bom", label: "Kiểm tra bơm, ống dẫn, không rò rỉ" },
    { id: "chay_thu", label: "Chạy thử chu trình rửa rỗng" },
  ],
  LM_SAY: [
    { id: "vs", label: "Vệ sinh khoang sấy" },
    { id: "loc", label: "Kiểm tra lọc không khí" },
    { id: "nhiet", label: "Kiểm tra cảm biến nhiệt / thời gian sấy" },
    { id: "chay_thu", label: "Chạy thử chu trình sấy rỗng" },
  ],
};

export function buildPmChecklistForLoaiMay(maLoaiMay: string | null | undefined): CssdPmChecklistItem[] {
  const ma = String(maLoaiMay || "").trim();
  const seed = BY_LOAI_MAY[ma] || DEFAULT_ITEMS;
  return seed.map((x) => ({ ...x, done: false }));
}

export function allChecklistDone(items: CssdPmChecklistItem[]): boolean {
  if (!items.length) return true;
  return items.every((x) => x.done);
}

export function parseChecklistJson(raw: unknown): CssdPmChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id || `item-${i}`),
        label: String(r.label || ""),
        done: Boolean(r.done),
      };
    })
    .filter((x) => x.label);
}
