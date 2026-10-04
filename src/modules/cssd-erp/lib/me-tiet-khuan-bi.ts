/**
 * ME-01 — sổ BI BM.02: ống đối chứng, ống thử, giờ ủ/đọc, số lô.
 * Quy tắc QT23: đối chứng ≠ DUONG → kết quả không hợp lệ, không nhả mẻ.
 */

export type BiOngKetQua = "AM" | "DUONG";
export type BiTrangThaiMoRong = "CHUA_CO" | "DANG_U" | "AM" | "DUONG";

export type BiBm02Input = {
  trangThaiBi?: string | null;
  ongDoiChung?: string | null;
  ongThu?: string | null;
  gioBatDauU?: string | null;
  gioDoc?: string | null;
  soLoBi?: string | null;
};

export type BiBm02Record = {
  trangThaiBi: "AM" | "DUONG";
  ongDoiChung: BiOngKetQua;
  ongThu: BiOngKetQua;
  gioBatDauU: string;
  gioDoc: string;
  soLoBi: string;
};

const MSG_BI_KHONG_HOP_LE = "Kết quả BI không hợp lệ — ống đối chứng phải dương tính; chạy lại thử nghiệm.";

function norm(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

/** Đọc sổ BM.02 từ `tk_qc_json` (tương thích khi chưa có cột riêng). */
export function readBiBm02FromQcJson(qc: Record<string, unknown> | null | undefined): BiBm02Input {
  if (!qc || typeof qc !== "object") return {};
  return {
    trangThaiBi: qc.trang_thai_bi != null ? String(qc.trang_thai_bi) : null,
    ongDoiChung: qc.ong_doi_chung != null ? String(qc.ong_doi_chung) : null,
    ongThu: qc.ong_thu != null ? String(qc.ong_thu) : null,
    gioBatDauU: qc.gio_bat_dau_u != null ? String(qc.gio_bat_dau_u) : null,
    gioDoc: qc.gio_doc != null ? String(qc.gio_doc) : null,
    soLoBi: qc.so_lo_bi != null ? String(qc.so_lo_bi) : null,
  };
}

export function biBm02ToQcPatch(rec: BiBm02Record): Record<string, string> {
  return {
    trang_thai_bi: rec.trangThaiBi,
    ong_doi_chung: rec.ongDoiChung,
    ong_thu: rec.ongThu,
    gio_bat_dau_u: rec.gioBatDauU,
    gio_doc: rec.gioDoc,
    so_lo_bi: rec.soLoBi,
  };
}

/**
 * Kiểm sổ BM.02 khi ghi kết quả BI (âm/dương).
 * Đối chứng phải DUONG; ống thử khớp kết quả; đủ giờ ủ/đọc và số lô.
 */
export function assertBiBm02HopLe(
  input: BiBm02Input,
): { ok: true; record: BiBm02Record } | { ok: false; message: string } {
  const ketQua = norm(input.trangThaiBi);
  if (ketQua !== "AM" && ketQua !== "DUONG") {
    return { ok: false, message: "Kết quả BI chỉ nhận âm hoặc dương khi ghi sổ BM.02." };
  }
  const doiChung = norm(input.ongDoiChung);
  if (doiChung !== "AM" && doiChung !== "DUONG") {
    return { ok: false, message: "Chọn kết quả ống đối chứng (dương/âm)." };
  }
  if (doiChung !== "DUONG") {
    return { ok: false, message: MSG_BI_KHONG_HOP_LE };
  }
  const ongThu = norm(input.ongThu);
  if (ongThu !== "AM" && ongThu !== "DUONG") {
    return { ok: false, message: "Chọn kết quả ống thử nghiệm (âm/dương)." };
  }
  if (ongThu !== ketQua) {
    return { ok: false, message: "Ống thử phải khớp kết quả BI đã chọn." };
  }
  const soLo = String(input.soLoBi ?? "").trim();
  if (!soLo) return { ok: false, message: "Nhập số lô BI (cùng lô ống đối chứng và ống thử)." };
  const gioU = String(input.gioBatDauU ?? "").trim();
  const gioDoc = String(input.gioDoc ?? "").trim();
  if (!gioU) return { ok: false, message: "Thiếu giờ bắt đầu ủ BI." };
  if (!gioDoc) return { ok: false, message: "Thiếu giờ đọc BI." };
  const tU = Date.parse(gioU);
  const tDoc = Date.parse(gioDoc);
  if (!Number.isFinite(tU) || !Number.isFinite(tDoc)) {
    return { ok: false, message: "Giờ ủ / giờ đọc BI không hợp lệ." };
  }
  if (tDoc < tU) {
    return { ok: false, message: "Giờ đọc BI không được trước giờ bắt đầu ủ." };
  }
  return {
    ok: true,
    record: {
      trangThaiBi: ketQua,
      ongDoiChung: "DUONG",
      ongThu: ongThu as BiOngKetQua,
      gioBatDauU: new Date(tU).toISOString(),
      gioDoc: new Date(tDoc).toISOString(),
      soLoBi: soLo.slice(0, 80),
    },
  };
}

/** Nhả mẻ sau BI âm: đối chứng dương + ống thử âm. */
export function canReleaseAfterBiAm(input: BiBm02Input): boolean {
  const gate = assertBiBm02HopLe({ ...input, trangThaiBi: "AM" });
  return gate.ok;
}

/**
 * Khi nhả mẻ với BI = AM (implant / Plasma / EO chọn Âm ngay tại QC):
 * bắt buộc sổ BM.02 hợp lệ. CHUA_CO / DANG_U không qua cổng này.
 */
export function assertBiAmReleaseAllowed(input: BiBm02Input): { ok: true } | { ok: false; message: string } {
  const bi = norm(input.trangThaiBi);
  if (bi !== "AM") return { ok: true };
  const gate = assertBiBm02HopLe(input);
  if (!gate.ok) return gate;
  return { ok: true };
}

export { MSG_BI_KHONG_HOP_LE };
