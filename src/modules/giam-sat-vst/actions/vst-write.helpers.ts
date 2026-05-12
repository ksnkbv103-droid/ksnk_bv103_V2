import {
  HINH_THUC_KHACH_QUAN,
  HINH_THUC_TU_GIAM_SAT,
} from "@/lib/supervision-policy";

export const HINH_THUC_GIAM_SAT_OPTIONS = [HINH_THUC_TU_GIAM_SAT, HINH_THUC_KHACH_QUAN] as const;
export const CACH_THUC_GIAM_SAT_OPTIONS = [
  "Giám sát trực tiếp tại chỗ",
  "Giám sát trực tiếp qua camera",
  "Giám sát lại qua camera",
] as const;
const LEGACY_CACH_THUC_VALUES = new Set(CACH_THUC_GIAM_SAT_OPTIONS);
export type ModeOption = (typeof HINH_THUC_GIAM_SAT_OPTIONS)[number];
export type CachOption = (typeof CACH_THUC_GIAM_SAT_OPTIONS)[number];
export type SessionInput = {
  khoa_id?: string;
  khu_vuc_id?: string;
  nguoi_giam_sat_id?: string;
  ngay_giam_sat?: string;
  thoi_gian_bat_dau?: string;
  thoi_gian_ket_thuc?: string;
  vi_tri?: string;
  hinh_thuc_giam_sat?: string | null;
  cach_thuc_giam_sat?: string | null;
};
export type ImportRow = Record<string, unknown>;
export type ExistingSessionRow = { id?: string };

export function vstWriteErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

export function optionalFkFromUnknown(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") return raw.trim() || null;
  return String(raw).trim() || null;
}

export function normalizeVstModeFields(input: { hinh_thuc_giam_sat?: unknown; cach_thuc_giam_sat?: unknown }) {
  const hinh = String(input.hinh_thuc_giam_sat ?? "").trim();
  const cach = String(input.cach_thuc_giam_sat ?? "").trim();
  if (!cach && LEGACY_CACH_THUC_VALUES.has(hinh as CachOption)) {
    return { hinh: "Giám sát khách quan", cach: hinh };
  }
  return { hinh, cach };
}

export function validateVstModeFields(hinh: string, cach: string) {
  if (!HINH_THUC_GIAM_SAT_OPTIONS.includes(hinh as ModeOption)) {
    throw new Error("Hình thức giám sát không hợp lệ. Chỉ chấp nhận: Tự giám sát hoặc Giám sát khách quan.");
  }
  if (!CACH_THUC_GIAM_SAT_OPTIONS.includes(cach as CachOption)) {
    throw new Error(
      "Cách thức giám sát không hợp lệ. Chỉ chấp nhận: trực tiếp tại chỗ, trực tiếp qua camera, giám sát lại qua camera.",
    );
  }
}

export function logVstSaveDebug(message: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  if (detail) console.log(`[VST save] ${message}`, detail);
  else console.log(`[VST save] ${message}`);
}

export function formatVstKhoaFkViolation(message: string | undefined): string {
  const m = (message || "").trim();
  if (m.includes("giam_sat_vst_khoa_id_fkey")) {
    return (
      `${m} — Bảng chi tiết cơ hội VST (giam_sat_vst) đang dùng FK khoa_id lệch source-of-truth. ` +
      "Liên hệ đội vận hành DB để chạy migration/fix script chuẩn hiện hành cho FK khoa_id theo dm_khoa_phong."
    );
  }
  if (!m.includes("giam_sat_vst_sessions_khoa_id_fkey")) return m;
  return (
    `${m} — FK khoa_id của VST đang lệch source-of-truth hoặc dữ liệu khoa cũ chưa được chuẩn hóa. ` +
    "Liên hệ đội vận hành DB để rà soát orphan khoa_id và áp fix chuẩn hiện hành."
  );
}
