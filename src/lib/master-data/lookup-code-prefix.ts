/** Prefix mã lookup theo category_type / loaiDanhMuc (đồng bộ wave 2). */

export const LOOKUP_CODE_PREFIX: Readonly<Record<string, string>> = {
  NGHE_NGHIEP: "NN",
  HINH_THUC_GIAM_SAT: "HT",
  CACH_THUC_GIAM_SAT: "CT",
  CHUC_DANH: "CD",
  CHUC_VU: "CV",
  LOAI_MAY_TIET_KHUAN: "LM",
  LOAI_SU_CO: "SC",
  TO_CONG_TAC: "TC",
  KHU_VUC_GIAM_SAT: "KV",
};

/** Slug không dấu, UPPER_SNAKE — dùng cho suffix mã mới. */
export function slugifyLookupCode(raw: string, maxLen = 28): string {
  const s = String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9\s/_-]+/g, " ")
    .trim()
    .replace(/[\s/\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();

  if (!s) return "MUC";
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).replace(/_+$/, "");
}

export function lookupCodePrefixForLoai(loaiDanhMuc: string): string | null {
  return LOOKUP_CODE_PREFIX[String(loaiDanhMuc || "").trim().toUpperCase()] ?? null;
}

export function composeLookupCode(prefix: string, slug: string): string {
  const p = String(prefix || "").trim().toUpperCase();
  const s = slugifyLookupCode(slug);
  return s ? `${p}_${s}` : p;
}

/** Tránh trùng: thêm _2, _3… */
export function dedupeLookupCode(base: string, existing: Set<string>): string {
  const normalized = base.toUpperCase();
  if (!existing.has(normalized)) return normalized;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${normalized}_${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${normalized}_${Date.now()}`;
}

export function collectExistingCodes(rows: unknown[], maColumn: string): Set<string> {
  const set = new Set<string>();
  for (const r of rows) {
    const code = String((r as Record<string, unknown>)[maColumn] ?? "").trim().toUpperCase();
    if (code) set.add(code);
  }
  return set;
}

export function nextSequentialPrefixedCode(prefix: string, existing: Set<string>): string {
  const p = prefix.toUpperCase();
  let maxSeq = 0;
  const re = new RegExp(`^${p}_(\\d+)$`);
  for (const code of existing) {
    const m = code.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n);
    }
    const legacy = code.match(/^DM-(\d+)$/i);
    if (legacy) {
      const n = parseInt(legacy[1], 10);
      if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n);
    }
  }
  return `${p}_${String(maxSeq + 1).padStart(3, "0")}`;
}
