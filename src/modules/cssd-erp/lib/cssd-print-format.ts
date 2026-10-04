/** Định dạng hiển thị cho phiếu in CSSD (A4). */

import { isCssdCycleUsedClinically } from "@/modules/cssd-su-co/domain/cssd-used-clinically";
import { formatDateTimeVi, formatDateVi } from "@/lib/format-datetime-vi";
import type {
  CssdBatchAnhMinhChung,
  CssdBatchPrintData,
  CssdCapPhatPrintIncident,
  CssdQcProofRow,
} from "../types/cssd-print.types";
import {
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_VOID,
  readIncidentPhieuStatus,
} from "@/modules/cssd-su-co/domain/cssd-incident-status";

/** Dòng phủ định M8-A khi không có SC mẻ/chu trình ghi nhận. */
export const CAP_PHAT_NO_INCIDENT_LINE = "Không có sự cố mẻ/chu trình ghi nhận";

const INCIDENT_STATUS_PRINT_EXTRA: Record<string, string> = {
  DA_DONG: "Đã đóng (giải phóng)",
  CLOSED: "Đã đóng (giải phóng)",
};

export function formatCapPhatIncidentStatus(attrs: Record<string, unknown> | null | undefined): string {
  const raw = String(attrs?.INCIDENT_STATUS ?? "").trim().toUpperCase();
  if (raw === INCIDENT_STATUS_VOID) return INCIDENT_STATUS_LABEL.VO_HIEU;
  if (INCIDENT_STATUS_PRINT_EXTRA[raw]) return INCIDENT_STATUS_PRINT_EXTRA[raw];
  const status = readIncidentPhieuStatus(attrs);
  return INCIDENT_STATUS_LABEL[status] || status;
}

/** Map hàng SC → dòng in phiếu cấp phát; bỏ phiếu vô hiệu. */
export function mapCapPhatPrintIncidents(
  rows: Array<{
    id?: string | null;
    attributes?: Record<string, unknown> | null;
    mo_ta?: string | null;
  }>,
): CssdCapPhatPrintIncident[] {
  const out: CssdCapPhatPrintIncident[] = [];
  for (const row of rows) {
    const attrs = row.attributes && typeof row.attributes === "object" ? row.attributes : {};
    if (readIncidentPhieuStatus(attrs) === INCIDENT_STATUS_VOID) continue;
    const id = String(row.id || "").trim();
    const typeCode = String(attrs.INCIDENT_TYPE_CODE ?? "").trim();
    out.push({
      ma: id ? id.slice(0, 8).toUpperCase() : "—",
      trangThai: formatCapPhatIncidentStatus(attrs),
      loai: typeCode || String(row.mo_ta || "").trim() || "—",
    });
  }
  return out;
}

export function formatCssdPrintDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const formatted = formatDateTimeVi(iso, "");
  return formatted || String(iso);
}

export function formatCssdPrintDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const formatted = formatDateVi(iso, "");
  return formatted || String(iso);
}

const METHOD_LABEL: Record<string, string> = {
  HOI_NUOC: "Hơi nước",
  PLASMA_H2O2: "Plasma H2O2",
  EO: "EO",
};

const PRINTABLE_BATCH_STATUS = new Set(["CHO_BI", "QC_KHONG_DAT", "THU_HOI", "HOAN_THANH"]);

/** Đạt / Không đạt bằng chữ. Không in mã `[DAT]`. */
export function formatQcTriWord(raw: string | null | undefined): string {
  const v = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[\[\]]/g, "");
  if (v === "DAT") return "Đạt";
  if (v === "KHONG_DAT") return "Không đạt";
  return "—";
}

export function formatBiPrintLabel(raw: string | null | undefined): string {
  const v = String(raw || "").trim().toUpperCase();
  if (v === "AM") return "Âm";
  if (v === "DUONG") return "Dương";
  if (v === "CHUA_CO") return "Chưa có";
  return "Chưa có";
}

export function formatSterilizerMethodLabel(raw: string | null | undefined): string {
  const v = String(raw || "").trim().toUpperCase();
  return METHOD_LABEL[v] || (v ? v : "—");
}

export function formatCycleMeasure(value: number | string | null | undefined, unit: string): string {
  if (value == null) return "—";
  const text = String(value).trim();
  if (!text) return "—";
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n)) return "—";
  return `${n} ${unit}`;
}

export function formatBatchTicketStatus(
  trangThaiMe: string | null | undefined,
  ketQuaTest: boolean | null | undefined,
): string {
  const st = String(trangThaiMe || "").trim().toUpperCase();
  if (st === "CHO_BI") return "Chờ BI";
  if (st === "THU_HOI") return "Thu hồi";
  if (st === "QC_KHONG_DAT") return "Không đạt";
  if (st === "HOAN_THANH" || ketQuaTest === true) return "Đạt";
  if (ketQuaTest === false) return "Không đạt";
  return "Chưa kết luận";
}

export function canPrintBatchTicket(input: {
  trangThaiMe?: string | null;
  ketQuaTest?: boolean | null;
}): boolean {
  const st = String(input.trangThaiMe || "").trim().toUpperCase();
  if (PRINTABLE_BATCH_STATUS.has(st)) return true;
  return input.ketQuaTest === true || input.ketQuaTest === false;
}


/** Nhãn xử lý bộ trên phiếu in khi mẻ thu hồi / không đạt (M-23 / Domain 23). */
export function formatBatchMemberRecallXuLy(input: {
  usedClinically?: boolean | null;
  usedClinicallyAt?: string | null;
  usedClinicallyBy?: string | null;
  metadata?: unknown;
  /** @deprecated Domain 23 — không đủ làm nguồn used. */
  maCaMoId?: string | null;
  isActive?: boolean | null;
}): string {
  if (
    isCssdCycleUsedClinically({
      usedClinically: input.usedClinically,
      usedClinicallyAt: input.usedClinicallyAt,
      usedClinicallyBy: input.usedClinicallyBy,
      metadata: input.metadata,
    })
  ) {
    return "Đã dùng lâm sàng — liệt kê đánh giá KSNK (không thu hồi được)";
  }
  if (input.isActive === false) {
    return "Thu hồi về Tiếp nhận (xử lý lại như dụng cụ bẩn)";
  }
  return "Trong mẻ";
}

export type CssdBatchTicketSource = {
  id: string;
  maLo: string;
  tenMay: string;
  phuongPhap?: string | null;
  chuongTrinh?: string | null;
  nhietDo?: number | string | null;
  apSuat?: number | string | null;
  thoiGianChuKy?: number | string | null;
  nguoiNap?: string | null;
  nguoiDo?: string | null;
  nguoiNha?: string | null;
  thoiGianBatDau?: string | null;
  tkMoFormQcAt?: string | null;
  thoiGianNha?: string | null;
  trangThaiMe?: string | null;
  trangThaiBi?: string | null;
  ketQuaTest?: boolean | null;
  coImplant?: boolean | null;
  qcVatLy?: string | null;
  qcCiNgoai?: string | null;
  qcCiPcd?: string | null;
  ghiChuQc?: string | null;
  members: { maBo: string; tenBo: string; xuLyLabel?: string }[];
};

export function buildCssdBatchTicket(source: CssdBatchTicketSource): CssdBatchPrintData {
  const trangThaiLabel = formatBatchTicketStatus(source.trangThaiMe, source.ketQuaTest);
  const qcVatLy = formatQcTriWord(source.qcVatLy);
  const qcCiNgoai = formatQcTriWord(source.qcCiNgoai);
  const qcCiPcd = formatQcTriWord(source.qcCiPcd);
  const biLabel = formatBiPrintLabel(source.trangThaiBi);
  const nhietDo = formatCycleMeasure(source.nhietDo, "°C");
  const apSuat = formatCycleMeasure(source.apSuat, "áp suất");
  const thoiGianChuKy = formatCycleMeasure(source.thoiGianChuKy, "phút");
  const nguoiNap = String(source.nguoiNap || "").trim() || "—";
  const nguoiDo = String(source.nguoiDo || "").trim() || "—";
  const nguoiNha = String(source.nguoiNha || "").trim() || "—";
  return {
    batchId: source.id,
    maLo: source.maLo,
    trangThaiLabel,
    ketQuaDat: trangThaiLabel === "Đạt",
    coTheIn: canPrintBatchTicket({ trangThaiMe: source.trangThaiMe, ketQuaTest: source.ketQuaTest }),
    thietBi: source.tenMay || "—",
    phuongPhap: formatSterilizerMethodLabel(source.phuongPhap),
    chuongTrinh: String(source.chuongTrinh || "").trim() || "—",
    nhietDo,
    apSuat,
    thoiGianChuKy,
    nguoiNap,
    nguoiDo,
    nguoiNha,
    thoiGianBatDau: source.thoiGianBatDau ?? null,
    thoiGianKetThucChuTrinh: source.tkMoFormQcAt ?? null,
    thoiGianNha: source.thoiGianNha ?? null,
    qcVatLy,
    qcCiNgoai,
    qcCiPcd,
    biLabel,
    coImplantLabel: source.coImplant ? "Có" : "Không",
    members: source.members.map((member, idx) => ({
      stt: idx + 1,
      maQrBo: member.maBo || "—",
      tenBo: member.tenBo || "—",
      xuLyLabel: String(member.xuLyLabel || "").trim() || undefined,
    })),
    nguoiLoad: nguoiNap,
    nguoiUnload: nguoiDo,
    nhietDoApSuat: [nhietDo, apSuat].filter((part) => part !== "—").join(" / ") || "—",
    thongSoMay: thoiGianChuKy,
    chiThiTiepXuc: qcVatLy,
    chiThiDaThongSo: qcCiPcd,
    testSinhHoc: biLabel,
    testCI: qcCiNgoai,
    testBowieDick: "—",
    thoiGianKetThuc: source.tkMoFormQcAt ?? null,
    ghiChuQc: String(source.ghiChuQc || ""),
    anhMinhChung: { may: "", tiepXuc: "", daThongSo: "", sinhHoc: "", bowieDick: "" },
  };
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
