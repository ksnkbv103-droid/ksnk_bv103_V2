/** Định dạng hiển thị cho phiếu in CSSD (A4). */

import type { CssdBatchAnhMinhChung, CssdBatchPrintData, CssdQcProofRow } from "../types/cssd-print.types";

export function formatCssdPrintDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCssdPrintDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("vi-VN");
}

export function formatCssdTriLabel(raw: string | null | undefined): string {
  const v = String(raw || "").trim().toUpperCase();
  if (v === "DAT") return "Đạt";
  if (v === "KHONG_DAT") return "Không đạt";
  if (v === "NA") return "N/A";
  return v ? v.replace(/_/g, " ") : "—";
}

export function parseNguoiLoadFromGhiChu(ghiChu: string | null | undefined): string {
  const s = String(ghiChu || "");
  const m = s.match(/Người load:\s*([^|]+)/i);
  return m?.[1]?.trim() || "—";
}

export type CssdBatchQcJson = {
  nguoiUnload?: string;
  nhietDoApSuat?: string;
  thongSoMay?: string;
  chiThiTiepXuc?: string;
  chiThiDaThongSo?: string;
  testSinhHoc?: string;
  testCI?: string;
  testBowieDick?: string;
  anhMinhChung?: {
    may?: string;
    tiepXuc?: string;
    daThongSo?: string;
    sinhHoc?: string;
    bowieDick?: string;
  };
};

const EMPTY_ANH: CssdBatchAnhMinhChung = {
  may: "",
  tiepXuc: "",
  daThongSo: "",
  sinhHoc: "",
  bowieDick: "",
};

export function parseBatchAnhMinhChung(raw: unknown): CssdBatchAnhMinhChung {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ANH };
  const inner = (raw as Record<string, unknown>).anhMinhChung;
  if (!inner || typeof inner !== "object") return { ...EMPTY_ANH };
  const a = inner as Record<string, unknown>;
  return {
    may: String(a.may || "").trim(),
    tiepXuc: String(a.tiepXuc || "").trim(),
    daThongSo: String(a.daThongSo || "").trim(),
    sinhHoc: String(a.sinhHoc || "").trim(),
    bowieDick: String(a.bowieDick || "").trim(),
  };
}

export function isCssdPrintImageUrl(url: string | null | undefined): boolean {
  const v = String(url || "").trim();
  if (!v) return false;
  return /^https?:\/\//i.test(v) || /^data:image\//i.test(v) || v.startsWith("/");
}

export function buildCssdQcProofRows(data: CssdBatchPrintData): CssdQcProofRow[] {
  const a = data.anhMinhChung;
  const pick = (url: string) => (isCssdPrintImageUrl(url) ? url.trim() : null);

  return [
    {
      label: "Nhiệt độ / áp suất",
      ketQua: data.nhietDoApSuat || "—",
      anhUrl: null,
    },
    {
      label: "Thông số máy",
      ketQua: data.thongSoMay || "—",
      anhUrl: pick(a.may),
    },
    {
      label: "Chỉ thị tiếp xúc",
      ketQua: formatCssdTriLabel(data.chiThiTiepXuc),
      anhUrl: pick(a.tiepXuc),
    },
    {
      label: "Chỉ thị đa thông số",
      ketQua: formatCssdTriLabel(data.chiThiDaThongSo),
      anhUrl: pick(a.daThongSo),
    },
    {
      label: "Test sinh học (BI)",
      ketQua: formatCssdTriLabel(data.testSinhHoc),
      anhUrl: pick(a.sinhHoc),
    },
    {
      label: "Chỉ thị hóa học (CI)",
      ketQua: formatCssdTriLabel(data.testCI),
      anhUrl: pick(a.daThongSo),
    },
    {
      label: "Bowie–Dick",
      ketQua: formatCssdTriLabel(data.testBowieDick),
      anhUrl: pick(a.bowieDick),
    },
  ];
}

export function parseBatchQcJson(raw: unknown): CssdBatchQcJson {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const anhRaw = o.anhMinhChung;
  let anhMinhChung: CssdBatchQcJson["anhMinhChung"];
  if (anhRaw && typeof anhRaw === "object") {
    const ar = anhRaw as Record<string, unknown>;
    anhMinhChung = {
      may: String(ar.may || "").trim() || undefined,
      tiepXuc: String(ar.tiepXuc || "").trim() || undefined,
      daThongSo: String(ar.daThongSo || "").trim() || undefined,
      sinhHoc: String(ar.sinhHoc || "").trim() || undefined,
      bowieDick: String(ar.bowieDick || "").trim() || undefined,
    };
  }
  return {
    nguoiUnload: String(o.nguoiUnload || "").trim() || undefined,
    nhietDoApSuat: String(o.nhietDoApSuat || "").trim() || undefined,
    thongSoMay: String(o.thongSoMay || "").trim() || undefined,
    chiThiTiepXuc: String(o.chiThiTiepXuc || "").trim() || undefined,
    chiThiDaThongSo: String(o.chiThiDaThongSo || "").trim() || undefined,
    testSinhHoc: String(o.testSinhHoc || "").trim() || undefined,
    testCI: String(o.testCI || "").trim() || undefined,
    testBowieDick: String(o.testBowieDick || "").trim() || undefined,
    anhMinhChung,
  };
}
