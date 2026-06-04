import type { SupabaseClient } from "@supabase/supabase-js";
import type { SmartImportDmSessionCache } from "../lib/smart-import/dm-import-session-cache";
import { createDmImportSessionCache } from "../lib/smart-import/dm-import-session-cache";
import { finalizeNhanSuImportRow } from "./smart-import-nhan-su-import-row-finalize";
import { isImportMaEmpty, normalizeImportMa } from "./smart-import-resolvers-shared";

export async function resolveNhanSuParentIdsForImport(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  sessionCache?: SmartImportDmSessionCache,
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; error: string }> {
  const sb = supabase;
  const dm = sessionCache ?? createDmImportSessionCache(sb);
  const out = { ...row };
  const notes: string[] = [];
  const addNote = (msg: string) => {
    notes.push(msg);
  };
  const maKhoa = normalizeImportMa(out.ma_khoa);
  const maToRaw = normalizeImportMa(out.ma_to);
  const maTo = isImportMaEmpty(maToRaw) ? "" : maToRaw;
  const tenToCongTac = String((out.ten_to_cong_tac ?? "") || "")
    .replace(/^\ufeff/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  const maChucVu = normalizeImportMa(out.ma_chuc_vu);
  const maChucDanh = normalizeImportMa(out.ma_chuc_danh);
  const maVaiTroKsnk = normalizeImportMa(out.ma_vai_tro_ksnk);
  const maNgheNghiep = normalizeImportMa(out.ma_nghe_nghiep);
  const tenNgheNghiep = String(out.nghe_nghiep || "").trim();
  const khoaIdLegacy = String(out.khoa_id || "").trim();
  const toIdLegacy = String(out.to_id || "").trim();
  const chucVuIdLegacy = String(out.chuc_vu_id || "").trim();
  const chucDanhIdLegacy = String(out.chuc_danh_id || "").trim();
  const vaiTroIdLegacy = String(out.vai_tro_he_thong_id || "").trim();
  if (khoaIdLegacy || toIdLegacy) {
    out.khoa_id = null;
    out.to_id = null;
    addNote("Bỏ qua khoa_id/to_id vì contract import chỉ nhận ma_khoa/ma_to.");
  }
  if (chucVuIdLegacy) {
    out.chuc_vu_id = null;
    addNote("Bỏ qua chuc_vu_id vì contract import chỉ nhận ma_chuc_vu.");
  }
  if (chucDanhIdLegacy || vaiTroIdLegacy) {
    out.chuc_danh_id = null;
    out.vai_tro_he_thong_id = null;
    addNote("Bỏ qua chuc_danh_id/vai_tro_he_thong_id vì contract import chỉ nhận mã nghiệp vụ.");
  }
  const khoaResolved = await dm.resolveDanhMucId(maKhoa, "KHOA_PHONG");
  if (khoaResolved && typeof khoaResolved === "object" && "error" in khoaResolved)
    return { ok: false, error: khoaResolved.error };
  if (maKhoa && !khoaResolved) addNote(`ma_khoa (${maKhoa}) không tồn tại trong mdm_dm_khoa_phong -> để trống khoa_id.`);
  const toResolved = await dm.resolveDanhMucId(maTo, "TO_CONG_TAC");
  if (toResolved && typeof toResolved === "object" && "error" in toResolved)
    return { ok: false, error: toResolved.error };
  let toId = typeof toResolved === "string" ? toResolved : null;
  if (maTo && !toId && tenToCongTac) {
    const pack = await dm.getToCongTacRowsByTen(tenToCongTac);
    if (!pack.ok) return { ok: false, error: pack.error };
    const list = pack.rows;
    if (list.length === 1) toId = list[0].id;
    else if (list.length > 1) {
      return {
        ok: false,
        error: `Nhiều tổ trùng tên "${tenToCongTac}" (${list.length} dòng). Dùng đúng ma_to để định danh.`,
      };
    }
  }
  if (maTo && !toId) {
    addNote(`ma_to (${maTo}) không tồn tại trong mdm_dm_to_cong_tac -> để trống to_id.`);
  }
  if (!maTo && tenToCongTac && !toId) {
    const pack = await dm.getToCongTacRowsByTen(tenToCongTac);
    if (!pack.ok) return { ok: false, error: pack.error };
    const list = pack.rows;
    if (list.length === 1) toId = list[0].id;
    else if (list.length > 1) {
      return {
        ok: false,
        error: `Nhiều tổ trùng tên "${tenToCongTac}". Bổ sung ma_to chính xác.`,
      };
    }
    if (!toId) {
      addNote(`ten_to_cong_tac (${tenToCongTac}) không tồn tại trong mdm_dm_to_cong_tac -> để trống to_id.`);
    }
  }
  const chucVuResolved = await dm.resolveDanhMucId(maChucVu, "CHUC_VU");
  if (chucVuResolved && typeof chucVuResolved === "object" && "error" in chucVuResolved)
    return { ok: false, error: chucVuResolved.error };
  if (maChucVu && !chucVuResolved) addNote(`ma_chuc_vu (${maChucVu}) không tồn tại -> để trống chuc_vu_id.`);
  const chucDanhResolved = await dm.resolveDanhMucId(maChucDanh, "CHUC_DANH");
  if (chucDanhResolved && typeof chucDanhResolved === "object" && "error" in chucDanhResolved)
    return { ok: false, error: chucDanhResolved.error };
  if (maChucDanh && !chucDanhResolved) addNote(`ma_chuc_danh (${maChucDanh}) không tồn tại -> để trống chuc_danh_id.`);
  const vaiTroResolved = await dm.resolveDanhMucId(maVaiTroKsnk, "VAI_TRO_HE_THONG_KSNK");
  if (vaiTroResolved && typeof vaiTroResolved === "object" && "error" in vaiTroResolved)
    return { ok: false, error: vaiTroResolved.error };
  if (maVaiTroKsnk && !vaiTroResolved) {
    addNote(`ma_vai_tro_ksnk (${maVaiTroKsnk}) không tồn tại -> để trống vai_tro_he_thong_id.`);
  }

  let ngheNghiepId: string | null = null;
  if (maNgheNghiep) {
    const byMa = await dm.resolveDanhMucId(maNgheNghiep, "NGHE_NGHIEP");
    if (byMa && typeof byMa === "object" && "error" in byMa) return { ok: false, error: byMa.error };
    ngheNghiepId = typeof byMa === "string" ? byMa : null;
    if (!ngheNghiepId) {
      addNote(`ma_nghe_nghiep (${maNgheNghiep}) không tồn tại -> để trống nghe_nghiep_id.`);
    }
  } else if (tenNgheNghiep) {
    const byTen = await dm.resolveNgheNghiepIdByTen(tenNgheNghiep);
    if (byTen && typeof byTen === "object" && "error" in byTen) return { ok: false, error: byTen.error };
    ngheNghiepId = typeof byTen === "string" ? byTen : null;
    if (!ngheNghiepId) {
      addNote(`nghe_nghiep (${tenNgheNghiep}) không tồn tại -> để trống nghe_nghiep_id.`);
    }
  }

  const kId = typeof khoaResolved === "string" ? khoaResolved : null;
  const cvId = typeof chucVuResolved === "string" ? chucVuResolved : null;
  const cdId = typeof chucDanhResolved === "string" ? chucDanhResolved : null;
  const vtId = typeof vaiTroResolved === "string" ? vaiTroResolved : null;
  await finalizeNhanSuImportRow(sb, out, {
    khoaResolved: kId,
    toId,
    chucVuResolved: cvId,
    chucDanhResolved: cdId,
    vaiTroResolved: vtId,
  });
  out.khoa_id = kId;
  out.to_id = toId;
  out.chuc_vu_id = cvId;
  out.chuc_danh_id = cdId;
  out.vai_tro_he_thong_id = vtId;
  out.nghe_nghiep_id = ngheNghiepId;
  if (notes.length > 0) out.__import_notes__ = notes.join(" | ");
  return { ok: true, row: out };
}
