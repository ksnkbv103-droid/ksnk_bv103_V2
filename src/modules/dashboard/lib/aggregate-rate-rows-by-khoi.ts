/** Gộp các dòng tỷ lệ theo khoa (có id khoa) thành nhóm theo dm_khoi_khoa. */

export type RateRowWithKhoaId = {
  id?: string | null;
  ten: string;
  dat: number;
  tong: number;
  ty_le: number;
};

export type RateRowKhoiAgg = {
  id: string;
  ten: string;
  dat: number;
  tong: number;
  ty_le: number;
};

/** Chuẩn hóa nhãn khoa để khớp RPC (chỉ có `ten`) với `dm_khoa_phong.ten_khoa`. */
export function normalizeKhoaTenForLookup(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * RPC cũ có thể không trả `id` trên từng dòng by_khoa — suy UUID khoa từ `ten` (một id / mỗi tên sau chuẩn hóa).
 */
export function hydrateByKhoaRowIds(
  rows: RateRowWithKhoaId[],
  khoaRows: Array<{ id: string; ten_khoa?: string | null }>
): RateRowWithKhoaId[] {
  const tenToId = new Map<string, string>();
  for (const r of khoaRows) {
    const key = normalizeKhoaTenForLookup(String(r.ten_khoa ?? ""));
    if (!key || key === "—") continue;
    if (!tenToId.has(key)) tenToId.set(key, String(r.id));
  }
  return rows.map((row) => {
    if (row.id?.trim()) return row;
    const id = tenToId.get(normalizeKhoaTenForLookup(row.ten));
    return id ? { ...row, id } : row;
  });
}

export function aggregateRateRowsByKhoi(
  byKhoa: RateRowWithKhoaId[],
  khoaCatalog: Array<{ id: string; khoi_id?: string }>,
  khoiCatalog: Array<{ id: string; label: string }>
): RateRowKhoiAgg[] {
  const khoiLabel = new Map(khoiCatalog.map((k) => [k.id, k.label] as const));
  const khoaToKhoi = new Map(khoaCatalog.map((k) => [k.id, String(k.khoi_id || "")] as const));
  const acc = new Map<string, { dat: number; tong: number }>();

  for (const row of byKhoa) {
    let khoiKey: string;
    const kidKhoa = row.id?.trim();
    if (!kidKhoa) {
      khoiKey = "__nokhoa__";
    } else {
      const kid = khoaToKhoi.get(kidKhoa) ?? "";
      khoiKey = kid || "__none__";
    }
    const cur = acc.get(khoiKey) ?? { dat: 0, tong: 0 };
    cur.dat += Number(row.dat) || 0;
    cur.tong += Number(row.tong) || 0;
    acc.set(khoiKey, cur);
  }

  const out: RateRowKhoiAgg[] = [];
  for (const [khoiKey, v] of acc) {
    let ten: string;
    if (khoiKey === "__nokhoa__") ten = "— Không gắn khoa (DM)";
    else if (khoiKey === "__none__") ten = "— Chưa gán khối";
    else ten = khoiLabel.get(khoiKey) || "Khối không xác định";
    const ty_le = v.tong > 0 ? Math.round((v.dat * 1000) / v.tong) / 10 : 0;
    out.push({ id: khoiKey, ten, dat: v.dat, tong: v.tong, ty_le });
  }
  out.sort((a, b) => b.ty_le - a.ty_le);
  return out;
}
