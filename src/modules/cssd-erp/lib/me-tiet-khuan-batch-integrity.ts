/**
 * Luật toàn vẹn phiếu mẻ (ME-S1) — thuần, không I/O.
 * RPC `rpc_cssd_me_*` lặp lại các điều kiện này trong transaction.
 */

export type PassMemberRow = {
  id: string;
  is_active?: boolean | null;
  lo_tiet_khuan_id?: string | null;
  /** Mã trạm (`cssd_dm_tram.ma_tram` / view `ma_trang_thai_hien_tai`). */
  ma_tram?: string | null;
};

/** Danh sách bộ kết luận ĐẠT: server suy từ mẻ, không nhận mảng id từ client. */
export function derivePassQuyTrinhIds(
  rows: PassMemberRow[],
  batchId: string,
): { ok: true; ids: string[] } | { ok: false; message: string } {
  const bid = String(batchId || "").trim();
  const ids = rows
    .filter((r) => r.is_active === true)
    .filter((r) => String(r.lo_tiet_khuan_id || "").trim() === bid)
    .filter((r) => String(r.ma_tram || "").trim().toUpperCase() === "TIET_KHUAN")
    .map((r) => String(r.id || "").trim())
    .filter(Boolean);

  if (!ids.length) {
    return {
      ok: false,
      message: "Không có bộ đang ở trạm tiệt khuẩn trong mẻ — không kết luận ĐẠT.",
    };
  }
  return { ok: true, ids };
}

/** Mỗi máy một mẻ chưa kết luận (`ket_qua_test` null). */
export function rejectIfMachineHasOpenBatch(openMaLo: string | null | undefined): string | null {
  const ma = String(openMaLo || "").trim();
  if (!ma) return null;
  return `Máy đang có mẻ chưa kết luận (${ma}). Kết thúc mẻ đó trước khi tạo mẻ mới.`;
}

export type StartMemberCheck = {
  maQr?: string | null;
  tram?: string | null;
  isActive?: boolean | null;
  isDongBang?: boolean | null;
};

/** Bắt đầu mẻ: từng bộ phải còn ĐÓNG GÓI, hiệu lực, không khóa an toàn. */
export function rejectStartMember(member: StartMemberCheck): string | null {
  const code = String(member.maQr || "").trim() || "—";
  if (member.isActive !== true) {
    return `Bộ ${code} không còn hiệu lực — không bắt đầu mẻ.`;
  }
  if (member.isDongBang === true) {
    return `Bộ ${code} đang khóa an toàn — không bắt đầu mẻ.`;
  }
  const tram = String(member.tram || "").trim().toUpperCase();
  if (tram !== "DONG_GOI") {
    return `Bộ ${code} không ở ĐÓNG GÓI (hiện ${tram || "—"}) — không bắt đầu mẻ.`;
  }
  return null;
}

/**
 * Bộ mẹ đã tách SUB không vào mẻ — chỉ bộ thành phần.
 * Schema không có `parent_bo_id`: liên kết là `ma_vai_tro_bo = MAIN`
 * hoặc quy trình con `quy_trinh_cha_id` + `ma_vai_tro_bo = SUB`.
 */
export function rejectParentBoWithSub(input: {
  maVaiTroBo?: string | null;
  hasActiveSub?: boolean | null;
}): string | null {
  const role = String(input.maVaiTroBo || "").trim().toUpperCase();
  if (role === "MAIN" || input.hasActiveSub === true) {
    return "Bộ mẹ đã có thành phần SUB — chỉ quét bộ thành phần vào mẻ, không quét bộ mẹ.";
  }
  return null;
}
