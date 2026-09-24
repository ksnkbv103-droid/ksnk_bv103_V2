/** UX phiếu mẻ (ME-S4) — thuần, không I/O. */

export type MeSlipStep = 1 | 2 | 3 | 4 | 5 | 6;

export type MeTrangThaiBadge = { label: string; className: string };

const BADGE = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold";

const TRANG_THAI_BADGE: Record<string, MeTrangThaiBadge> = {
  DANG_CHUAN_NAP: { label: "Đang nạp", className: `${BADGE} border-sky-200 bg-sky-50 text-sky-800` },
  DANG_TIET_KHUAN: { label: "Đang chạy", className: `${BADGE} border-blue-200 bg-blue-50 text-blue-800` },
  CHO_DANH_GIA_QC: { label: "Đang chạy", className: `${BADGE} border-blue-200 bg-blue-50 text-blue-800` },
  CHO_BI: { label: "Chờ BI", className: `${BADGE} border-violet-200 bg-violet-50 text-violet-800` },
  Quarantine_BI: { label: "Chờ BI", className: `${BADGE} border-violet-200 bg-violet-50 text-violet-800` },
  HOAN_THANH: { label: "Hoàn thành", className: `${BADGE} border-emerald-200 bg-emerald-50 text-emerald-800` },
  QC_KHONG_DAT: { label: "Không đạt", className: `${BADGE} border-red-200 bg-red-50 text-red-700` },
  THU_HOI: { label: "Thu hồi", className: `${BADGE} border-red-300 bg-red-50 text-red-800` },
};

/** Badge tiếng Việt trên danh sách mẻ. Mã lạ không đưa ra UI. */
export function meTrangThaiBadge(state: string | null | undefined): MeTrangThaiBadge {
  const key = String(state || "").trim();
  return TRANG_THAI_BADGE[key] || { label: "—", className: `${BADGE} border-slate-200 bg-slate-50 text-slate-500` };
}

export function slipStatusLabel(input: {
  step: MeSlipStep;
  choBi?: boolean;
  ketQuaTest?: boolean | null;
  trangThai?: string | null;
}): string {
  const st = String(input.trangThai || "").trim();
  if (input.choBi || st === "CHO_BI" || st === "Quarantine_BI") return "Chờ BI";
  if (st === "THU_HOI") return "Thu hồi";
  if (input.ketQuaTest === false || st === "QC_KHONG_DAT") return "Không đạt";
  if (input.ketQuaTest === true || st === "HOAN_THANH") return "Hoàn thành";
  if (input.step <= 4) return "Đang nạp";
  return "Đang chạy";
}

/**
 * Bước hiện tại trên phiếu: Máy → Chương trình → Quét bộ → Bắt đầu → Kết thúc → Nhả.
 * Máy đã chọn khi phiếu tồn tại.
 */
export function currentMeSlipStep(input: {
  chuongTrinh?: string | null;
  itemCount: number;
  napLocked: boolean;
  qcOpen: boolean;
  choBi?: boolean;
  ketQuaTest?: boolean | null;
  trangThai?: string | null;
}): MeSlipStep {
  const st = String(input.trangThai || "").trim();
  if (input.choBi || st === "CHO_BI" || st === "Quarantine_BI") return 6;
  if (
    input.ketQuaTest === true ||
    input.ketQuaTest === false ||
    st === "HOAN_THANH" ||
    st === "QC_KHONG_DAT" ||
    st === "THU_HOI"
  ) {
    return 6;
  }
  if (input.qcOpen || st === "CHO_DANH_GIA_QC") return 5;
  if (input.napLocked || st === "DANG_TIET_KHUAN") return 5;
  if (!String(input.chuongTrinh || "").trim()) return 2;
  if (input.itemCount <= 0) return 3;
  return 4;
}

export type WaitingSetRow = {
  id?: string | null;
  ma_vach_qr?: string | null;
  lo_tiet_khuan_id?: string | null;
  is_dong_bang?: boolean | null;
};

/** Bỏ bộ khóa an toàn, bộ đã nằm trong phiếu này, hoặc bộ đã gắn mẻ khác. */
export function filterWaitingSetsForSlip<T extends WaitingSetRow>(
  rows: T[],
  opts: { inSlipIds?: string[]; inSlipCodes?: string[] },
): T[] {
  const ids = new Set((opts.inSlipIds || []).map((id) => String(id || "").trim()).filter(Boolean));
  const codes = new Set(
    (opts.inSlipCodes || []).map((code) => String(code || "").trim().toUpperCase()).filter(Boolean),
  );
  return rows.filter((row) => {
    if (row.is_dong_bang === true) return false;
    const id = String(row.id || "").trim();
    if (id && ids.has(id)) return false;
    const code = String(row.ma_vach_qr || "").trim().toUpperCase();
    if (code && codes.has(code)) return false;
    const lo = String(row.lo_tiet_khuan_id || "").trim();
    if (lo) return false;
    return true;
  });
}

export type MeQcDraft = {
  chuongTrinh: string;
  nhietDo: string;
  apSuat: string;
  thoiGianChuKy: string;
  thongSoVatLy: "DAT" | "KHONG_DAT" | "";
  ciNgoaiGoi: "DAT" | "KHONG_DAT" | "";
  ciPcd: "DAT" | "KHONG_DAT" | "";
  trangThaiBi: "CHUA_CO" | "AM" | "DUONG" | "";
};

const TRI = new Set(["DAT", "KHONG_DAT", ""]);
const BI = new Set(["CHUA_CO", "AM", "DUONG", ""]);

export function meQcDraftStorageKey(batchId: string): string {
  return `bv103.me-qc-draft.${String(batchId || "").trim()}`;
}

function asTri(value: unknown): MeQcDraft["thongSoVatLy"] {
  const v = String(value ?? "").trim().toUpperCase();
  return TRI.has(v) ? (v as MeQcDraft["thongSoVatLy"]) : "";
}

function asBi(value: unknown): MeQcDraft["trangThaiBi"] {
  const v = String(value ?? "").trim().toUpperCase();
  return BI.has(v) ? (v as MeQcDraft["trangThaiBi"]) : "";
}

export function parseMeQcDraft(raw: string | null | undefined): MeQcDraft | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<MeQcDraft>;
    if (!o || typeof o !== "object") return null;
    return {
      chuongTrinh: String(o.chuongTrinh || "").slice(0, 80),
      nhietDo: String(o.nhietDo || "").slice(0, 32),
      apSuat: String(o.apSuat || "").slice(0, 32),
      thoiGianChuKy: String(o.thoiGianChuKy || "").slice(0, 16),
      thongSoVatLy: asTri(o.thongSoVatLy),
      ciNgoaiGoi: asTri(o.ciNgoaiGoi),
      ciPcd: asTri(o.ciPcd),
      trangThaiBi: asBi(o.trangThaiBi),
    };
  } catch {
    return null;
  }
}

export function serializeMeQcDraft(draft: MeQcDraft): string {
  return JSON.stringify(draft);
}
