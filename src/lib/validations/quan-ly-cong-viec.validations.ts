import { z } from "zod";

/** Form / client hay gửi `""` thay vì `null` — Postgres UUID / optional FK cần null. */
function qlcvEmptyToNull(v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") {
    const cleaned = v.replace(/\u0000/g, "").trim();
    return cleaned === "" ? null : cleaned;
  }
  return v;
}

const optionalUuid = (field: string) =>
  z.preprocess(
    qlcvEmptyToNull,
    z.union([z.string().uuid(`${field} không hợp lệ`), z.null()]).optional(),
  );

/**
 * Zod Schema cho Quản lý công việc v2.2 — CHECK `fact_cong_viec` (migration 20260716005 Track B).
 */
const CONG_VIEC_TRANG_THAI = [
  "MOI",
  "DANG_LAM",
  "CHO_DUYET",
  "HOAN_THANH",
  "TU_CHOI",
  "QUA_HAN",
  "DA_HUY",
] as const;

export const congViecSchema = z.object({
  tieu_de: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\u0000/g, "") : v),
    z.string().trim().min(1, "Tiêu đề không được để trống"),
  ),
  mo_ta: z.preprocess(qlcvEmptyToNull, z.union([z.string(), z.null()]).optional()),
  loai_cong_viec: z.enum(["DINH_KY", "DOT_XUAT", "KHAN_CAP"]).default("DOT_XUAT"),
  muc_do_uu_tien: z.enum(["THAP", "TRUNG_BINH", "CAO"]).default("TRUNG_BINH"),

  nguoi_phu_trach_id: optionalUuid("Người phụ trách"),
  khoa_thuc_hien_id: optionalUuid("Khoa thực hiện"),
  to_cong_tac_id: optionalUuid("Tổ công tác"),

  han_hoan_thanh: z.preprocess(qlcvEmptyToNull, z.union([z.string().min(1), z.null()]).optional()),
  cong_viec_cha_id: optionalUuid("Công việc cha"),
});

export type CongViecInput = z.infer<typeof congViecSchema>;
