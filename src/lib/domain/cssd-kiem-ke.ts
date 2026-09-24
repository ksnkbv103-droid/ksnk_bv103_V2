/** Cửa đếm KIEM_KE — nhập số thực, suy tồn. Không sửa danh mục, không thay 3 cửa. */

export const KIEM_KE_LEDGER_TYPE = "KIEM_KE" as const;

export const KIEM_KE_IA_NOTE =
  "Kiểm kê chỉ ghi số đếm thực tế. Hệ thống tự tính tồn bộ, kho lẻ và tổng loại. Không sửa Loại, Bộ hay thành phần. Hỏng/Mất và luân chuyển ở Sự cố; sửa danh mục ở Đề nghị.";

export type KiemKeCountInput = {
  loaiDungCuId: string;
  soLuongThucTe: number;
  soLuongKho: number;
  /** Tổng tồn trong mọi bộ của loại, trước lần đếm (gồm dòng bộ đang đếm). */
  soLuongTrongBo: number;
  soLuongDem: number;
  /** null = không đếm kho lẻ lần này. */
  khoDem: number | null;
};

export type KiemKeDerived = {
  tonBo: number;
  tonKho: number;
  tonTrongBo: number;
  tonLoai: number;
  deltaBo: number;
  deltaKho: number;
};

export type KiemKePosting = {
  loaiGiaoDich: typeof KIEM_KE_LEDGER_TYPE;
  loaiDungCuId: string;
  boDungCuId: string | null;
  soLuongThayDoi: number;
};

function asInt(n: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.trunc(v);
}

export function deriveKiemKeLine(
  input: KiemKeCountInput,
): { ok: true; derived: KiemKeDerived } | { ok: false; error: string } {
  if (!String(input.loaiDungCuId || "").trim()) {
    return { ok: false, error: "Thiếu loại dụng cụ." };
  }
  if (!Number.isInteger(input.soLuongDem) || input.soLuongDem < 0) {
    return { ok: false, error: "Số đếm bộ phải là số nguyên không âm." };
  }
  if (input.khoDem != null && (!Number.isInteger(input.khoDem) || input.khoDem < 0)) {
    return {
      ok: false,
      error: "Số đếm kho lẻ phải là số nguyên không âm, hoặc để trống nếu không kiểm kho.",
    };
  }

  const tonBoTruoc = asInt(input.soLuongThucTe);
  const khoTruoc = asInt(input.soLuongKho);
  const trongBoTruoc = asInt(input.soLuongTrongBo);
  const tonBo = input.soLuongDem;
  const tonKho = input.khoDem == null ? khoTruoc : input.khoDem;
  const tonTrongBo = trongBoTruoc - tonBoTruoc + tonBo;

  return {
    ok: true,
    derived: {
      tonBo,
      tonKho,
      tonTrongBo,
      tonLoai: tonTrongBo + tonKho,
      deltaBo: tonBo - tonBoTruoc,
      deltaKho: input.khoDem == null ? 0 : tonKho - khoTruoc,
    },
  };
}

/** Chỉ sinh dòng sổ KIEM_KE khi delta khác 0. Không có trường danh mục. */
export function planKiemKePostings(
  boDungCuId: string,
  input: KiemKeCountInput,
): { ok: true; postings: KiemKePosting[] } | { ok: false; error: string } {
  const derived = deriveKiemKeLine(input);
  if (!derived.ok) return derived;
  const bo = String(boDungCuId || "").trim();
  if (!bo) return { ok: false, error: "Thiếu bộ dụng cụ." };

  const postings: KiemKePosting[] = [];
  if (derived.derived.deltaBo !== 0) {
    postings.push({
      loaiGiaoDich: KIEM_KE_LEDGER_TYPE,
      loaiDungCuId: String(input.loaiDungCuId).trim(),
      boDungCuId: bo,
      soLuongThayDoi: derived.derived.deltaBo,
    });
  }
  if (input.khoDem != null && derived.derived.deltaKho !== 0) {
    postings.push({
      loaiGiaoDich: KIEM_KE_LEDGER_TYPE,
      loaiDungCuId: String(input.loaiDungCuId).trim(),
      boDungCuId: null,
      soLuongThayDoi: derived.derived.deltaKho,
    });
  }
  return { ok: true, postings };
}
