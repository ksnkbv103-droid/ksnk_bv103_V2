import { todayYmdInVn } from "@/lib/format-datetime-vi";
import type { SterilizerMethod } from "../helpers/me-tiet-khuan-machine-kind";

export type QcTri = "DAT" | "KHONG_DAT";
export type BiTrangThai = "CHUA_CO" | "AM" | "DUONG";
export type MeQcOutcome = "HOAN_THANH" | "CHO_BI" | "QC_KHONG_DAT";

const TRI = new Set(["DAT", "KHONG_DAT"]);
const BI = new Set(["CHUA_CO", "AM", "DUONG"]);

export type MeQcInput = {
  thongSoVatLy?: string | null;
  ciNgoaiGoi?: string | null;
  ciPcd?: string | null;
  trangThaiBi?: string | null;
  method?: SterilizerMethod | null;
  coImplant?: boolean | null;
  nhietDo?: string | number | null;
  apSuat?: string | number | null;
  thoiGianChuKy?: string | number | null;
};

export type MeQcDecision = {
  outcome: MeQcOutcome;
  ketQuaBi: boolean | null;
  ketQuaCi: boolean | null;
  bioFail: boolean;
  biBatBuoc: boolean;
  nhietDo: number | null;
  apSuat: number | null;
  thoiGianChuKy: number | null;
};

function norm(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function rejectTri(label: string, raw: string | null | undefined): string | null {
  const v = norm(raw);
  if (!v || v === "CHUA_DANH_GIA" || v === "NA") {
    return `${label} bắt buộc chọn Đạt hoặc Không đạt.`;
  }
  if (!TRI.has(v)) return `${label} không hợp lệ.`;
  return null;
}

function parseOptionalNumber(raw: string | number | null | undefined, label: string): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  const s = String(raw).trim().replace(",", ".");
  if (!s) return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, message: `${label} không phải số.` };
  return { ok: true, value: n };
}

/** BI bắt buộc từng mẻ: plasma, EO, hoặc mẻ có bộ implant. Hơi nước thường chỉ nhắc tuần. */
export function biRequiredForBatch(method: SterilizerMethod | null | undefined, coImplant: boolean | null | undefined): boolean {
  if (coImplant) return true;
  return method === "PLASMA_H2O2" || method === "EO";
}

export function steamBiWeeklyReminder(input: {
  method: SterilizerMethod | null | undefined;
  lastBiAt?: string | null;
  now?: Date;
}): string | null {
  if (input.method !== "HOI_NUOC") return null;
  const now = input.now ?? new Date();
  const raw = String(input.lastBiAt || "").trim();
  if (!raw) return "Máy hơi nước chưa có mẻ ghi kết quả BI trong 7 ngày.";
  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return "Máy hơi nước chưa có mẻ ghi kết quả BI trong 7 ngày.";
  if (now.getTime() - at > 7 * 24 * 60 * 60 * 1000) {
    return "Máy hơi nước chưa có kết quả BI trong 7 ngày qua.";
  }
  return null;
}

/**
 * Server không tin cờ Đạt từ client.
 * Một mục Không đạt hoặc BI dương → mẻ không đạt.
 * BI bắt buộc mà chưa có kết quả → CHO_BI, bộ không nhả.
 * NA / chưa đánh giá bị từ chối. `ket_qua_bi` chưa có → null, không ghi false.
 */
export function evaluateMeQcRelease(input: MeQcInput): { ok: true; decision: MeQcDecision } | { ok: false; message: string } {
  const missing =
    rejectTri("Thông số vật lý", input.thongSoVatLy) ||
    rejectTri("CI ngoài gói", input.ciNgoaiGoi) ||
    rejectTri("CI PCD", input.ciPcd);
  if (missing) return { ok: false, message: missing };

  const nhiet = parseOptionalNumber(input.nhietDo, "Nhiệt độ");
  if (!nhiet.ok) return nhiet;
  const ap = parseOptionalNumber(input.apSuat, "Áp suất");
  if (!ap.ok) return ap;
  const chuKy = parseOptionalNumber(input.thoiGianChuKy, "Thời gian chu kỳ");
  if (!chuKy.ok) return chuKy;

  if (input.method === "HOI_NUOC") {
    if (nhiet.value == null) return { ok: false, message: "Máy hơi nước cần nhiệt độ." };
    if (ap.value == null) return { ok: false, message: "Máy hơi nước cần áp suất." };
    if (chuKy.value == null) return { ok: false, message: "Máy hơi nước cần thời gian chu kỳ." };
  }

  const biRaw = norm(input.trangThaiBi);
  if (!biRaw || biRaw === "CHUA_DANH_GIA" || biRaw === "NA") {
    return { ok: false, message: "Chọn kết quả BI: chưa có, âm hoặc dương." };
  }
  if (!BI.has(biRaw)) return { ok: false, message: "Kết quả BI không hợp lệ." };
  const trangThaiBi = biRaw as BiTrangThai;

  const physicalFail = norm(input.thongSoVatLy) === "KHONG_DAT";
  const ciNgoaiFail = norm(input.ciNgoaiGoi) === "KHONG_DAT";
  const ciPcdFail = norm(input.ciPcd) === "KHONG_DAT";
  const bioFail = trangThaiBi === "DUONG";
  const anyFail = physicalFail || ciNgoaiFail || ciPcdFail || bioFail;
  const ketQuaCi = ciNgoaiFail || ciPcdFail ? false : true;
  const ketQuaBi = trangThaiBi === "AM" ? true : trangThaiBi === "DUONG" ? false : null;
  const biBatBuoc = biRequiredForBatch(input.method, input.coImplant);

  let outcome: MeQcOutcome = "HOAN_THANH";
  if (anyFail) outcome = "QC_KHONG_DAT";
  else if (biBatBuoc && trangThaiBi === "CHUA_CO") outcome = "CHO_BI";

  return {
    ok: true,
    decision: {
      outcome,
      ketQuaBi,
      ketQuaCi,
      bioFail,
      biBatBuoc,
      nhietDo: nhiet.value,
      apSuat: ap.value,
      thoiGianChuKy: chuKy.value == null ? null : Math.round(chuKy.value),
    },
  };
}

/** Mã mẻ `<mã/tên ngắn máy>-ddMMyy-n` theo lịch Việt Nam. RPC dùng cùng quy tắc. */
export function formatMeMaLo(input: { machineCode: string; at?: Date; seq: number }): string {
  const at = input.at ?? new Date();
  const ymd = todayYmdInVn(at);
  const [year, month, day] = ymd.split("-");
  const ddmmyy = `${day}${month}${String(year).slice(2)}`;
  const token = shortMachineToken(input.machineCode);
  const seq = Math.max(1, Math.floor(Number(input.seq) || 1));
  return `${token}-${ddmmyy}-${seq}`;
}

export function shortMachineToken(machineCode: string): string {
  const folded = String(machineCode || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 12);
  return folded || "MAY";
}

export function isMeMaLoScan(code: string): boolean {
  return /^[A-Z0-9]+-\d{6}-\d+$/.test(String(code || "").trim().toUpperCase());
}
