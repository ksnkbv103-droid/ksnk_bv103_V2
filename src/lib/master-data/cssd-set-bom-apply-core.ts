import type { SupabaseClient } from "@supabase/supabase-js";
import {
  doiLoaiIsRelink,
  normalizeMaLoaiDeXuat,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";

function newChiTietMa(): string {
  return `DC-R${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

async function findLoaiByMa(supabase: SupabaseClient, ma: string) {
  const code = normalizeMaLoaiDeXuat(ma).replace(/[%_]/g, "");
  if (!code) return null;
  const { data, error } = await supabase
    .from("cssd_dm_loai_dung_cu")
    .select("id, ma_loai, ten_loai, specs")
    .eq("is_active", true)
    .ilike("ma_loai", code)
    .limit(2);
  if (error) throw new Error(error.message);
  if ((data || []).length > 1) {
    throw new Error(`Mã loại ${code} trùng hơn một dòng danh mục — sửa tại Quản trị trước khi duyệt.`);
  }
  return data?.[0] || null;
}

async function applyDoiLoaiLine(
  supabase: SupabaseClient,
  boDungCuId: string,
  line: SetReconcileLineInput,
  now: string,
): Promise<void> {
  const chiTietId = String(line.chiTietId || "").trim();
  const currentLoaiId = String(line.loaiDungCuId || "").trim();
  const nextMa = normalizeMaLoaiDeXuat(line.maLoaiDeXuat);
  const nextTen = String(line.tenDungCuLeDeXuat || "").trim();
  if (!chiTietId || !currentLoaiId || !nextMa) {
    throw new Error(`${line.tenDungCuLe}: thiếu dữ liệu đổi mã loại.`);
  }

  const existingByMa = await findLoaiByMa(supabase, nextMa);
  let targetLoaiId = currentLoaiId;
  if (doiLoaiIsRelink(line)) {
    targetLoaiId = String(line.loaiDungCuIdDeXuat || "").trim();
  } else if (existingByMa && String(existingByMa.id) !== currentLoaiId) {
    targetLoaiId = String(existingByMa.id);
  }

  const { data: target, error: targetErr } = await supabase
    .from("cssd_dm_loai_dung_cu")
    .select("id, ma_loai, ten_loai, specs")
    .eq("id", targetLoaiId)
    .eq("is_active", true)
    .maybeSingle();
  if (targetErr) throw new Error(targetErr.message);
  if (!target?.id) throw new Error(`${line.tenDungCuLe}: loại đề nghị không còn hiệu lực.`);

  const targetMa = normalizeMaLoaiDeXuat(String(target.ma_loai || ""));
  const tenSau = nextTen || String(target.ten_loai || line.tenDungCuLe);
  const shouldRename = nextMa !== targetMa && String(target.id) === currentLoaiId && !doiLoaiIsRelink(line);

  if (shouldRename) {
    if (existingByMa && String(existingByMa.id) !== String(target.id)) {
      throw new Error(
        `${line.tenDungCuLe}: mã ${nextMa} đã thuộc loại khác. Chọn loại đó trên phiếu, không đổi mã gốc trùng.`,
      );
    }
    const prevSpecs =
      target.specs && typeof target.specs === "object" && !Array.isArray(target.specs)
        ? (target.specs as Record<string, unknown>)
        : {};
    const { error: renameErr } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .update({
        ma_loai: nextMa,
        ten_loai: tenSau,
        specs: { ...prevSpecs, ma_loai_dung_cu: nextMa, ten_loai_dung_cu: tenSau },
        updated_at: now,
      })
      .eq("id", target.id);
    if (renameErr) throw new Error(renameErr.message);
  }

  const { error } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .update({
      loai_dung_cu_id: targetLoaiId,
      ten_dung_cu_le: tenSau,
      ten_chi_tiet: tenSau,
      updated_at: now,
    })
    .eq("id", chiTietId)
    .eq("bo_dung_cu_id", boDungCuId);
  if (error) throw new Error(error.message);
}

/** Áp đề nghị đổi sổ chuẩn sau khi admin duyệt phiếu. */
export async function applyApprovedBomLines(
  supabase: SupabaseClient,
  boDungCuId: string,
  lines: SetReconcileLineInput[],
): Promise<void> {
  const now = new Date().toISOString();
  for (const line of lines) {
    if (line.kind === "DOI_CHUAN") {
      const id = String(line.chiTietId || "").trim();
      const next = Math.floor(Number(line.soLuongChuanDeXuat) || 0);
      if (!id || next < 1) throw new Error(`${line.tenDungCuLe}: thiếu dữ liệu đổi chuẩn.`);
      const { error } = await supabase
        .from("cssd_dm_bo_dung_cu_chi_tiet")
        .update({ so_luong: next, updated_at: now })
        .eq("id", id)
        .eq("bo_dung_cu_id", boDungCuId);
      if (error) throw new Error(error.message);
      continue;
    }
    if (line.kind === "DOI_LOAI") {
      await applyDoiLoaiLine(supabase, boDungCuId, line, now);
      continue;
    }
    if (line.kind === "XOA_DONG") {
      const id = String(line.chiTietId || "").trim();
      if (!id) throw new Error(`${line.tenDungCuLe}: thiếu dòng để xóa.`);
      const { error } = await supabase
        .from("cssd_dm_bo_dung_cu_chi_tiet")
        .update({ is_active: false, updated_at: now })
        .eq("id", id)
        .eq("bo_dung_cu_id", boDungCuId);
      if (error) throw new Error(error.message);
      continue;
    }
    if (line.kind === "THEM_DONG") {
      const loaiId = String(line.loaiDungCuId || "").trim();
      const ten = String(line.tenDungCuLe || "").trim();
      const soLuong = Math.max(1, Math.floor(Number(line.soLuongChuan) || 1));
      if (!loaiId || !ten) throw new Error("Thêm dòng cần loại và tên dụng cụ.");
      const { error } = await supabase.from("cssd_dm_bo_dung_cu_chi_tiet").insert({
        bo_dung_cu_id: boDungCuId,
        loai_dung_cu_id: loaiId,
        ten_dung_cu_le: ten,
        ten_chi_tiet: ten,
        so_luong: soLuong,
        is_active: true,
        updated_at: now,
        specs: { ma_chi_tiet: newChiTietMa() },
      });
      if (error) throw new Error(error.message);
    }
  }
}
