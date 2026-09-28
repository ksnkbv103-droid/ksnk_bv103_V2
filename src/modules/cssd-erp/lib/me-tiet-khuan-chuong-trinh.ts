/**
 * Soft Soft Soft-safe M-04 — thin chương trình theo máy (Domain A / file 18 §2).
 * Không invent CDC: thông số mẫu chỉ neo QT21 HD.03 đã ghi trong 18 M-05.
 * Catalog viện đầy đủ = park MDM; Soft chỉ thin schema + picker + prefill.
 */

import type { SterilizerMethod } from "../helpers/me-tiet-khuan-machine-kind";

export type ChuongTrinhNguon = "mdm" | "specs" | "qt21_hd03" | "last_batch";

export type ChuongTrinhMayOption = {
  ma: string;
  ten: string;
  /** Prefill text — NV có thể sửa; lệch so với chuẩn → ghi audit ở qc json. */
  nhiet_do: string;
  ap_suat: string;
  thoi_gian_chu_ky: string;
  nguon: ChuongTrinhNguon;
  /** Ghi chú nguồn (QT21 HD.03 / specs). */
  nguon_label?: string;
};

export type ChuongTrinhPrefill = {
  chuongTrinh: string;
  nhietDo: string;
  apSuat: string;
  thoiGianChuKy: string;
  ma: string;
  nguon: ChuongTrinhNguon;
};

/** QT21 HD.03 (file 18 M-05) — mẫu theo PP, không phải catalog viện. */
export const QT21_HD03_CHUONG_TRINH_BY_PP: Record<SterilizerMethod, readonly ChuongTrinhMayOption[]> = {
  HOI_NUOC: [
    {
      ma: "HN_134",
      ten: "Hơi nước 134 °C",
      nhiet_do: "134",
      ap_suat: "",
      thoi_gian_chu_ky: "4-18",
      nguon: "qt21_hd03",
      nguon_label: "QT21 HD.03 · 134 °C 4–18 phút",
    },
    {
      ma: "HN_121",
      ten: "Hơi nước 121 °C",
      nhiet_do: "121",
      ap_suat: "",
      thoi_gian_chu_ky: "20-30",
      nguon: "qt21_hd03",
      nguon_label: "QT21 HD.03 · 121 °C 20–30 phút",
    },
  ],
  PLASMA_H2O2: [
    {
      ma: "PL_NGAN",
      ten: "Plasma chu trình ngắn",
      nhiet_do: "",
      ap_suat: "",
      thoi_gian_chu_ky: "28-35",
      nguon: "qt21_hd03",
      nguon_label: "QT21 HD.03 · plasma ngắn 28–35 phút",
    },
    {
      ma: "PL_DAI",
      ten: "Plasma chu trình dài",
      nhiet_do: "",
      ap_suat: "",
      thoi_gian_chu_ky: "45-75",
      nguon: "qt21_hd03",
      nguon_label: "QT21 HD.03 · plasma dài 45–75 phút",
    },
  ],
  EO: [
    {
      ma: "EO_AM",
      ten: "EO ấm 55 °C",
      nhiet_do: "55",
      ap_suat: "",
      thoi_gian_chu_ky: "60-240",
      nguon: "qt21_hd03",
      nguon_label: "QT21 HD.03 · EO ấm 55 °C 1–4 giờ",
    },
    {
      ma: "EO_LANH",
      ten: "EO lạnh 37 °C",
      nhiet_do: "37",
      ap_suat: "",
      thoi_gian_chu_ky: "120-360",
      nguon: "qt21_hd03",
      nguon_label: "QT21 HD.03 · EO lạnh 37 °C 2–6 giờ",
    },
  ],
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function normMa(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

function parseOneOption(raw: unknown, nguon: ChuongTrinhNguon): ChuongTrinhMayOption | null {
  const row = asRecord(raw);
  if (!row) return null;
  const ten = String(row.ten ?? row.ten_chuong_trinh ?? row.name ?? row.chuong_trinh ?? "").trim();
  const ma =
    normMa(row.ma ?? row.ma_chuong_trinh ?? row.code) ||
    normMa(ten) ||
    "";
  if (!ma && !ten) return null;
  return {
    ma: ma || normMa(ten) || "CT",
    ten: ten || ma,
    nhiet_do: String(row.nhiet_do ?? row.nhiet_do_chuan ?? "").trim().slice(0, 32),
    ap_suat: String(row.ap_suat ?? row.ap_suat_chuan ?? "").trim().slice(0, 32),
    thoi_gian_chu_ky: String(
      row.thoi_gian_chu_ky ?? row.thoi_gian ?? row.thoi_gian_chuan ?? "",
    )
      .trim()
      .slice(0, 32),
    nguon,
    nguon_label: String(row.nguon_label ?? "").trim() || undefined,
  };
}

/** Đọc catalog mỏng từ `cssd_dm_thiet_bi.specs.chuong_trinh_catalog` (+ mặc định đơn). */
export function parseChuongTrinhCatalogFromSpecs(specs: unknown): ChuongTrinhMayOption[] {
  const s = asRecord(specs);
  if (!s) return [];
  const out: ChuongTrinhMayOption[] = [];
  const seen = new Set<string>();
  const push = (opt: ChuongTrinhMayOption | null) => {
    if (!opt) return;
    const key = opt.ma;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(opt);
  };
  const catalog = s.chuong_trinh_catalog ?? s.chuong_trinh_list;
  if (Array.isArray(catalog)) {
    for (const item of catalog) push(parseOneOption(item, "specs"));
  }
  const single = String(s.chuong_trinh ?? s.chuong_trinh_mac_dinh ?? "").trim();
  if (single) {
    push({
      ma: normMa(single) || "MAC_DINH",
      ten: single.slice(0, 80),
      nhiet_do: String(s.nhiet_do_chuan ?? "").trim().slice(0, 32),
      ap_suat: String(s.ap_suat_chuan ?? "").trim().slice(0, 32),
      thoi_gian_chu_ky: String(s.thoi_gian_chuan ?? "").trim().slice(0, 32),
      nguon: "specs",
      nguon_label: "specs máy",
    });
  }
  return out;
}

/** Map dòng MDM `cssd_dm_chuong_trinh_may` (nếu tip đã có sau migrate). */
export function mapMdmChuongTrinhRows(
  rows: Array<Record<string, unknown>> | null | undefined,
): ChuongTrinhMayOption[] {
  if (!Array.isArray(rows)) return [];
  const out: ChuongTrinhMayOption[] = [];
  for (const row of rows) {
    if (row.is_active === false) continue;
    const opt = parseOneOption(
      {
        ma: row.ma_chuong_trinh,
        ten: row.ten_chuong_trinh,
        nhiet_do: row.nhiet_do_chuan,
        ap_suat: row.ap_suat_chuan,
        thoi_gian_chu_ky: row.thoi_gian_chuan,
        nguon_label: "MDM máy",
      },
      "mdm",
    );
    if (opt) out.push(opt);
  }
  return out;
}

/**
 * Options picker Soft Soft Soft-safe:
 * MDM table → specs catalog → QT21 HD.03 theo PP (không invent list viện).
 */
export function resolveChuongTrinhOptions(input: {
  method: SterilizerMethod | null | undefined;
  specs?: unknown;
  mdmRows?: Array<Record<string, unknown>> | null;
}): ChuongTrinhMayOption[] {
  const mdm = mapMdmChuongTrinhRows(input.mdmRows);
  if (mdm.length) return mdm;
  const fromSpecs = parseChuongTrinhCatalogFromSpecs(input.specs);
  if (fromSpecs.length) return fromSpecs;
  const method = input.method;
  if (!method) return [];
  return [...QT21_HD03_CHUONG_TRINH_BY_PP[method]];
}

/** Default = khớp gần nhất (last batch / specs default) trong list; else phần tử đầu. */
export function pickDefaultChuongTrinh(
  options: readonly ChuongTrinhMayOption[],
  hint?: string | null,
): ChuongTrinhMayOption | null {
  if (!options.length) return null;
  const h = String(hint ?? "").trim().toUpperCase();
  if (h) {
    const byMa = options.find((o) => o.ma.toUpperCase() === h || o.ten.toUpperCase() === h);
    if (byMa) return byMa;
    const soft = options.find(
      (o) => o.ten.toUpperCase().includes(h) || h.includes(o.ten.toUpperCase()) || h.includes(o.ma),
    );
    if (soft) return soft;
  }
  return options[0] ?? null;
}

export function prefillFromChuongTrinh(opt: ChuongTrinhMayOption): ChuongTrinhPrefill {
  return {
    chuongTrinh: opt.ten.slice(0, 80),
    nhietDo: opt.nhiet_do,
    apSuat: opt.ap_suat,
    thoiGianChuKy: opt.thoi_gian_chu_ky,
    ma: opt.ma,
    nguon: opt.nguon,
  };
}

/** Soft Soft Soft-safe audit flag khi NV sửa thông số lệch prefill. */
export function buildChuongTrinhEditAudit(input: {
  prefill: ChuongTrinhPrefill | null | undefined;
  chuongTrinh: string;
  nhietDo: string;
  apSuat: string;
  thoiGianChuKy: string;
}): Record<string, unknown> | null {
  if (!input.prefill) return null;
  const edited =
    String(input.chuongTrinh || "").trim() !== String(input.prefill.chuongTrinh || "").trim() ||
    String(input.nhietDo || "").trim() !== String(input.prefill.nhietDo || "").trim() ||
    String(input.apSuat || "").trim() !== String(input.prefill.apSuat || "").trim() ||
    String(input.thoiGianChuKy || "").trim() !== String(input.prefill.thoiGianChuKy || "").trim();
  if (!edited) {
    return {
      chuong_trinh_ma: input.prefill.ma,
      chuong_trinh_nguon: input.prefill.nguon,
      thong_so_edited: false,
    };
  }
  return {
    chuong_trinh_ma: input.prefill.ma,
    chuong_trinh_nguon: input.prefill.nguon,
    thong_so_edited: true,
    prefill: {
      chuong_trinh: input.prefill.chuongTrinh,
      nhiet_do: input.prefill.nhietDo,
      ap_suat: input.prefill.apSuat,
      thoi_gian_chu_ky: input.prefill.thoiGianChuKy,
    },
  };
}
