/** Nhật ký làm sạch — cổng QC (PCI.03.00). */

export type CssdWashKetQua = "DAT" | "KHONG_DAT";

export type CssdWashRecord = {
  ket_qua: CssdWashKetQua;
  thiet_bi_id: string;
  ten_thiet_bi?: string;
  ma_loai_may?: string;
  dm_hoa_chat_id: string;
  ten_hoa_chat?: string;
  ma_lo: string;
  han_su_dung?: string | null;
  so_luong_xuat?: number;
  recorded_at?: string;
  operator?: string;
};

export function parseWashRecord(raw: unknown): CssdWashRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const ket = String(r.ket_qua || "").trim().toUpperCase();
  if (ket !== "DAT" && ket !== "KHONG_DAT") return null;
  const thietBiId = String(r.thiet_bi_id || "").trim();
  const dmId = String(r.dm_hoa_chat_id || "").trim();
  const maLo = String(r.ma_lo || "").trim();
  if (!thietBiId || !dmId || !maLo) return null;
  return {
    ket_qua: ket,
    thiet_bi_id: thietBiId,
    ten_thiet_bi: r.ten_thiet_bi != null ? String(r.ten_thiet_bi) : undefined,
    ma_loai_may: r.ma_loai_may != null ? String(r.ma_loai_may) : undefined,
    dm_hoa_chat_id: dmId,
    ten_hoa_chat: r.ten_hoa_chat != null ? String(r.ten_hoa_chat) : undefined,
    ma_lo: maLo,
    han_su_dung: r.han_su_dung != null ? String(r.han_su_dung).slice(0, 10) : null,
    so_luong_xuat: r.so_luong_xuat != null ? Number(r.so_luong_xuat) : undefined,
    recorded_at: r.recorded_at != null ? String(r.recorded_at) : undefined,
    operator: r.operator != null ? String(r.operator) : undefined,
  };
}

export function washAllowsAdvanceToQc(raw: unknown): { ok: true } | { ok: false; message: string } {
  const wash = parseWashRecord(raw);
  if (!wash) {
    return {
      ok: false,
      message: "Chưa ghi nhận lần rửa. Chọn máy rửa, lô hóa chất và kết quả tại trạm Làm sạch trước khi QC.",
    };
  }
  if (wash.ket_qua !== "DAT") {
    return {
      ok: false,
      message: "Lần rửa không đạt — không chuyển QC. Rửa lại và ghi nhận ĐẠT.",
    };
  }
  return { ok: true };
}

export function validateWashInput(input: {
  thiet_bi_id?: string;
  ma_loai_may?: string;
  machine_ready?: boolean;
  is_washer?: boolean;
  dm_hoa_chat_id?: string;
  ma_lo?: string;
  han_su_dung?: string | null;
  lot_expired?: boolean;
  ket_qua?: string;
}): string | null {
  if (!String(input.thiet_bi_id || "").trim()) return "Chọn máy rửa / siêu âm (trạng thái sẵn sàng).";
  if (input.machine_ready === false) return "Máy đang không sẵn sàng — chọn máy READY.";
  if (input.is_washer === false) return "Chỉ được chọn máy rửa tự động hoặc siêu âm.";
  if (!String(input.dm_hoa_chat_id || "").trim()) return "Chọn hóa chất (lô FEFO, chưa hết hạn).";
  if (!String(input.ma_lo || "").trim()) return "Chọn lô hóa chất.";
  if (input.lot_expired) return "Không dùng lô hóa chất đã hết hạn.";
  const ket = String(input.ket_qua || "").trim().toUpperCase();
  if (ket !== "DAT" && ket !== "KHONG_DAT") return "Chọn kết quả rửa: Đạt hoặc Không đạt.";
  return null;
}
