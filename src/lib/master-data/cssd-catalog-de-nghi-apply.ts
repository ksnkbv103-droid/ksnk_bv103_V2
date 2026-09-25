import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeDeNghiItems,
  type CssdCatalogDeNghiBomLine,
  type CssdCatalogDeNghiKind,
} from "@/lib/domain/cssd-catalog-de-nghi";


async function insertLoai(
  supabase: SupabaseClient,
  payloadAfter: Record<string, unknown>,
  now: string,
): Promise<void> {
  const after = asRecord(payloadAfter);
  const ma = String(after.ma_loai || "").trim().toUpperCase();
  const ten = String(after.ten_loai || "").trim();
  if (!ma || !ten) throw new Error("Bổ sung loại cần mã và tên.");
  const { data: dup } = await supabase
    .from("cssd_dm_loai_dung_cu")
    .select("id")
    .eq("ma_loai", ma)
    .limit(1)
    .maybeSingle();
  if (dup?.id) throw new Error(`Mã loại ${ma} đã tồn tại.`);
  const specs: Record<string, unknown> = {};
  if (after.hinh_dang != null) specs.hinh_dang = String(after.hinh_dang);
  if (after.kich_thuoc != null) specs.kich_thuoc = String(after.kich_thuoc);
  if (after.cong_dung != null) specs.cong_dung = String(after.cong_dung);
  const { error } = await supabase.from("cssd_dm_loai_dung_cu").insert({
    ma_loai: ma,
    ten_loai: ten,
    mo_ta: after.mo_ta != null ? String(after.mo_ta) : null,
    is_chiu_nhiet: after.is_chiu_nhiet !== false,
    phuong_phap_tiet_khuan_chi_dinh: String(after.phuong_phap_tiet_khuan_chi_dinh || "STEAM_134"),
    phan_loai_spaulding: String(after.phan_loai_spaulding || "CRITICAL"),
    phan_loai: String(after.phan_loai || "PHAU_THUAT"),
    so_luong_kho_du_phong: Math.max(0, Math.floor(Number(after.so_luong_kho_du_phong) || 0)),
    specs,
    is_active: after.is_active !== false,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);
}

async function insertBo(
  supabase: SupabaseClient,
  payloadAfter: Record<string, unknown>,
  now: string,
): Promise<void> {
  const after = asRecord(payloadAfter);
  const ma = String(after.ma_bo || "").trim().toUpperCase();
  const ten = String(after.ten_bo || "").trim();
  if (!ma || !ten) throw new Error("Bổ sung bộ cần mã và tên.");
  const { data: dup } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id")
    .eq("ma_bo", ma)
    .limit(1)
    .maybeSingle();
  if (dup?.id) throw new Error(`Mã bộ ${ma} đã tồn tại.`);
  const { error } = await supabase.from("cssd_dm_bo_dung_cu").insert({
    ma_bo: ma,
    ten_bo: ten,
    loai_dung_cu_id: after.loai_dung_cu_id ? String(after.loai_dung_cu_id) : null,
    khoa_su_dung_id: after.khoa_su_dung_id ? String(after.khoa_su_dung_id) : null,
    quy_cach: after.quy_cach != null ? String(after.quy_cach) : null,
    ghi_chu: after.ghi_chu != null ? String(after.ghi_chu) : null,
    trang_thai: String(after.trang_thai || "ACTIVE"),
    phan_loai_bo: String(after.phan_loai_bo || "PHAU_THUAT"),
    co_ma_dinh_danh_rieng: after.co_ma_dinh_danh_rieng !== false,
    is_active: after.is_active !== false,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Patch UPDATE loại từ đề nghị. Không gồm kho dự phòng — cột đó chỉ ledger/RPC được ghi. */
export function buildLoaiCatalogUpdatePatch(
  payloadAfter: Record<string, unknown>,
  now: string,
): Record<string, unknown> {
  const after = asRecord(payloadAfter);
  const patch: Record<string, unknown> = { updated_at: now };
  if (after.ma_loai != null) patch.ma_loai = String(after.ma_loai).trim().toUpperCase();
  if (after.ten_loai != null) patch.ten_loai = String(after.ten_loai).trim();
  if (after.mo_ta != null) patch.mo_ta = String(after.mo_ta);
  if (typeof after.is_chiu_nhiet === "boolean") patch.is_chiu_nhiet = after.is_chiu_nhiet;
  if (after.phuong_phap_tiet_khuan_chi_dinh != null) {
    patch.phuong_phap_tiet_khuan_chi_dinh = String(after.phuong_phap_tiet_khuan_chi_dinh);
  }
  if (after.phan_loai_spaulding != null) patch.phan_loai_spaulding = String(after.phan_loai_spaulding);
  if (after.phan_loai != null) patch.phan_loai = String(after.phan_loai);
  if (typeof after.is_active === "boolean") patch.is_active = after.is_active;
  return patch;
}

async function applyLoai(
  supabase: SupabaseClient,
  targetId: string | null,
  targetMa: string,
  payloadAfter: Record<string, unknown>,
  now: string,
): Promise<void> {
  const id = String(targetId || "").trim();
  const ma = String(targetMa || asRecord(payloadAfter).ma_loai || "").trim();
  if (!id && !ma) throw new Error("Thiếu loại đích (id hoặc mã).");
  const after = asRecord(payloadAfter);
  const patch = buildLoaiCatalogUpdatePatch(after, now);

  // specs: hinh_dang / kich_thuoc / cong_dung
  const specsPatch: Record<string, unknown> = {};
  if (after.hinh_dang != null) specsPatch.hinh_dang = String(after.hinh_dang);
  if (after.kich_thuoc != null) specsPatch.kich_thuoc = String(after.kich_thuoc);
  if (after.cong_dung != null) specsPatch.cong_dung = String(after.cong_dung);
  if (Object.keys(specsPatch).length) {
    let rq = supabase.from("cssd_dm_loai_dung_cu").select("id, specs");
    if (id) rq = rq.eq("id", id);
    else rq = rq.eq("ma_loai", ma).eq("is_active", true);
    const { data: cur, error: curErr } = await rq.limit(1).maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!cur?.id) throw new Error("Không tìm thấy loại cần ghi đè.");
    const prev =
      cur.specs && typeof cur.specs === "object" && !Array.isArray(cur.specs)
        ? (cur.specs as Record<string, unknown>)
        : {};
    patch.specs = { ...prev, ...specsPatch };
    const { error } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .update(patch)
      .eq("id", cur.id);
    if (error) throw new Error(error.message);
    return;
  }

  if (Object.keys(patch).length <= 1) throw new Error("Không có trường loại để ghi đè.");
  let uq = supabase.from("cssd_dm_loai_dung_cu").update(patch);
  if (id) uq = uq.eq("id", id);
  else uq = uq.eq("ma_loai", ma).eq("is_active", true);
  const { error, data } = await uq.select("id").limit(2);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Không tìm thấy loại cần ghi đè.");
  if (data.length > 1) throw new Error("Mã loại trùng hơn một dòng — không ghi đè.");
}

async function applyBo(
  supabase: SupabaseClient,
  targetId: string | null,
  targetMa: string,
  payloadAfter: Record<string, unknown>,
  now: string,
): Promise<void> {
  const id = String(targetId || "").trim();
  const ma = String(targetMa || asRecord(payloadAfter).ma_bo || "").trim();
  if (!id && !ma) throw new Error("Thiếu bộ đích (id hoặc mã).");
  const after = asRecord(payloadAfter);
  const patch: Record<string, unknown> = { updated_at: now };
  if (after.ma_bo != null) patch.ma_bo = String(after.ma_bo).trim().toUpperCase();
  if (after.ten_bo != null) patch.ten_bo = String(after.ten_bo).trim();
  if (after.loai_dung_cu_id !== undefined) {
    patch.loai_dung_cu_id = after.loai_dung_cu_id ? String(after.loai_dung_cu_id) : null;
  }
  if (after.khoa_su_dung_id !== undefined) {
    patch.khoa_su_dung_id = after.khoa_su_dung_id ? String(after.khoa_su_dung_id) : null;
  }
  if (after.quy_cach != null) patch.quy_cach = String(after.quy_cach);
  if (after.ghi_chu != null) patch.ghi_chu = String(after.ghi_chu);
  if (after.trang_thai != null) patch.trang_thai = String(after.trang_thai);
  if (after.phan_loai_bo != null) patch.phan_loai_bo = String(after.phan_loai_bo);
  if (typeof after.co_ma_dinh_danh_rieng === "boolean") {
    patch.co_ma_dinh_danh_rieng = after.co_ma_dinh_danh_rieng;
  }
  if (typeof after.is_active === "boolean") patch.is_active = after.is_active;
  if (Object.keys(patch).length <= 1) throw new Error("Không có trường bộ để ghi đè.");
  let uq = supabase.from("cssd_dm_bo_dung_cu").update(patch);
  if (id) uq = uq.eq("id", id);
  else uq = uq.eq("ma_bo", ma).eq("is_active", true);
  const { error, data } = await uq.select("id").limit(2);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Không tìm thấy bộ cần ghi đè.");
  if (data.length > 1) throw new Error("Mã bộ trùng hơn một dòng — không ghi đè.");
}

async function applyBom(
  supabase: SupabaseClient,
  targetId: string | null,
  payloadAfter: Record<string, unknown>,
  now: string,
): Promise<void> {
  const boId = String(targetId || "").trim();
  if (!boId) throw new Error("Thiếu bộ đích cho thành phần.");
  const lines = Array.isArray(payloadAfter.lines)
    ? (payloadAfter.lines as CssdCatalogDeNghiBomLine[])
    : [];
  if (!lines.length) throw new Error("Thiếu dòng thành phần.");

  for (const line of lines) {
    if (line.op === "DELETE") {
      const chiTietId = String(line.chiTietId || "").trim();
      if (!chiTietId) throw new Error("Xóa dòng cần chiTietId.");
      const { error } = await supabase
        .from("cssd_dm_bo_dung_cu_chi_tiet")
        .update({ is_active: false, updated_at: now })
        .eq("id", chiTietId)
        .eq("bo_dung_cu_id", boId);
      if (error) throw new Error(error.message);
      continue;
    }
    if (line.op !== "UPSERT") throw new Error("op dòng BOM không hợp lệ.");
    let resolvedLoaiId = String(line.loaiDungCuId || "").trim();
    const maLoai = String(line.maLoai || "").trim().toUpperCase();
    const ten = String(line.tenDungCuLe || line.tenChiTiet || "").trim();
    const soLuong = Math.floor(Number(line.soLuong));
    if (!Number.isFinite(soLuong) || soLuong < 0) throw new Error("Số lượng chuẩn không hợp lệ.");
    if (!resolvedLoaiId && maLoai) {
      const { data: loai, error } = await supabase
        .from("cssd_dm_loai_dung_cu")
        .select("id")
        .eq("is_active", true)
        .ilike("ma_loai", maLoai)
        .limit(2);
      if (error) throw new Error(error.message);
      if (!loai?.length) throw new Error(`Không thấy loại ${maLoai}.`);
      if (loai.length > 1) throw new Error(`Mã loại ${maLoai} trùng.`);
      resolvedLoaiId = String(loai[0].id);
    }
    if (!resolvedLoaiId) throw new Error("UPSERT cần loaiDungCuId hoặc maLoai.");

    const patch: Record<string, unknown> = {
      loai_dung_cu_id: resolvedLoaiId,
      ten_dung_cu_le: ten || null,
      ten_chi_tiet: ten || null,
      so_luong: soLuong,
      is_active: true,
      updated_at: now,
    };
    if (line.maxSudsCount != null && String(line.maxSudsCount) !== "") {
      patch.max_suds_count = Math.floor(Number(line.maxSudsCount)) || null;
    }
    if (line.trongLuong != null && String(line.trongLuong) !== "") {
      patch.trong_luong = Number(line.trongLuong);
    }
    if (line.ghiChu != null) patch.ghi_chu = String(line.ghiChu);

    const chiTietId = String(line.chiTietId || "").trim();
    if (chiTietId) {
      const { error } = await supabase
        .from("cssd_dm_bo_dung_cu_chi_tiet")
        .update(patch)
        .eq("id", chiTietId)
        .eq("bo_dung_cu_id", boId);
      if (error) throw new Error(error.message);
      continue;
    }

    const { data: existing, error: exErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("id")
      .eq("bo_dung_cu_id", boId)
      .eq("loai_dung_cu_id", resolvedLoaiId)
      .eq("is_active", true)
      .limit(1);
    if (exErr) throw new Error(exErr.message);
    if (existing?.[0]?.id) {
      const { error } = await supabase
        .from("cssd_dm_bo_dung_cu_chi_tiet")
        .update(patch)
        .eq("id", existing[0].id);
      if (error) throw new Error(error.message);
    } else {
      const maChiTiet =
        String(line.maChiTiet || "").trim().toUpperCase() ||
        `DC-R${Date.now().toString(36).slice(-6).toUpperCase()}`;
      const { error } = await supabase.from("cssd_dm_bo_dung_cu_chi_tiet").insert({
        ...patch,
        bo_dung_cu_id: boId,
        ma_chi_tiet: maChiTiet,
        created_at: now,
      });
      if (error) throw new Error(error.message);
    }
  }
}

export async function applyCatalogDeNghiOverwrite(
  supabase: SupabaseClient,
  args: {
    kind: CssdCatalogDeNghiKind;
    targetId: string | null;
    targetMa: string;
    payloadAfter: Record<string, unknown>;
    payloadBefore?: Record<string, unknown>;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const items = normalizeDeNghiItems({
    targetKind: args.kind,
    targetId: args.targetId,
    targetMa: args.targetMa,
    payloadBefore: args.payloadBefore,
    payloadAfter: args.payloadAfter,
  });
  if (!items.length) throw new Error("Phiếu không có dòng để ghi đè.");
  for (const it of items) {
    const isCreate = it.op === "CREATE";
    if (it.kind === "LOAI") {
      if (isCreate) await insertLoai(supabase, it.after, now);
      else await applyLoai(supabase, it.targetId || null, String(it.targetMa || ""), it.after, now);
    } else if (it.kind === "BO") {
      if (isCreate) await insertBo(supabase, it.after, now);
      else await applyBo(supabase, it.targetId || null, String(it.targetMa || ""), it.after, now);
    } else {
      // BOM CREATE = UPSERT lines trên bộ đích (đã có); bổ sung dòng mới không có chiTietId.
      await applyBom(supabase, it.targetId || null, it.after, now);
    }
  }
}
