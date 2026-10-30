import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeDeNghiItems,
  type CssdCatalogDeNghiBomLine,
  type CssdCatalogDeNghiKind,
} from "@/lib/domain/cssd-catalog-de-nghi";
import {
  isSteamMethod,
  normalizePhuongPhapChoPhep,
  resolveLoaiSterileMethod,
} from "@/lib/master-data/cssd-loai-dung-cu-map";

/** Loại đổi chịu nhiệt qua đề nghị — caller gọi tách bộ (module CSSD) sau khi ghi. */
export type LoaiHeatChangeFromDeNghi = {
  loaiId: string;
  prevIsChiuNhiet: boolean | null;
  nextIsChiuNhiet: boolean;
};

const BOM_TABLE = "cssd_dm_bo_dung_cu_chi_tiet";

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
  const choPhep = normalizePhuongPhapChoPhep(after.phuong_phap_cho_phep);
  let isChiuNhiet = after.is_chiu_nhiet !== false;
  let method: string;
  if (choPhep.length) {
    isChiuNhiet = choPhep.some(isSteamMethod);
    method = choPhep[0];
  } else {
    const rawMethod = after.phuong_phap_tiet_khuan_chi_dinh;
    const resolved = resolveLoaiSterileMethod({
      isChiuNhiet,
      method: rawMethod,
      methodExplicit: rawMethod != null && String(rawMethod).trim() !== "",
    });
    if (!resolved.ok) throw new Error(resolved.error);
    method = resolved.method;
    choPhep.push(resolved.method);
  }
  const { error } = await supabase.from("cssd_dm_loai_dung_cu").insert({
    ma_loai: ma,
    ten_loai: ten,
    mo_ta: after.mo_ta != null ? String(after.mo_ta) : null,
    is_chiu_nhiet: isChiuNhiet,
    phuong_phap_tiet_khuan_chi_dinh: method,
    phuong_phap_cho_phep: choPhep,
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
  const choPhep = normalizePhuongPhapChoPhep(after.phuong_phap_cho_phep);
  if (choPhep.length) {
    patch.phuong_phap_cho_phep = choPhep;
    patch.phuong_phap_tiet_khuan_chi_dinh = choPhep[0];
    patch.is_chiu_nhiet = choPhep.some(isSteamMethod);
  } else if (after.phuong_phap_tiet_khuan_chi_dinh != null) {
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
): Promise<LoaiHeatChangeFromDeNghi | null> {
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
  if (Object.keys(patch).length <= 1 && !Object.keys(specsPatch).length) {
    throw new Error("Không có trường loại để ghi đè.");
  }

  // Đọc hiện trạng: kiểm tổ hợp chịu nhiệt + PP sau patch và biết có hạ chịu nhiệt không.
  let rq = supabase
    .from("cssd_dm_loai_dung_cu")
    .select("id, specs, is_chiu_nhiet, phuong_phap_tiet_khuan_chi_dinh");
  if (id) rq = rq.eq("id", id);
  else rq = rq.eq("ma_loai", ma).eq("is_active", true);
  const { data: curRows, error: curErr } = await rq.limit(2);
  if (curErr) throw new Error(curErr.message);
  if (!curRows?.length) throw new Error("Không tìm thấy loại cần ghi đè.");
  if (curRows.length > 1) throw new Error("Mã loại trùng hơn một dòng — không ghi đè.");
  const cur = curRows[0] as {
    id: string;
    specs: unknown;
    is_chiu_nhiet: boolean | null;
    phuong_phap_tiet_khuan_chi_dinh: string | null;
  };

  const prevIsChiuNhiet = typeof cur.is_chiu_nhiet === "boolean" ? cur.is_chiu_nhiet : null;
  const nextIsChiuNhiet =
    typeof patch.is_chiu_nhiet === "boolean" ? patch.is_chiu_nhiet : prevIsChiuNhiet !== false;
  if (
    patch.phuong_phap_cho_phep === undefined &&
    (patch.is_chiu_nhiet !== undefined || patch.phuong_phap_tiet_khuan_chi_dinh !== undefined)
  ) {
    const explicit = patch.phuong_phap_tiet_khuan_chi_dinh !== undefined;
    const resolved = resolveLoaiSterileMethod({
      isChiuNhiet: nextIsChiuNhiet,
      method: explicit ? patch.phuong_phap_tiet_khuan_chi_dinh : cur.phuong_phap_tiet_khuan_chi_dinh,
      methodExplicit: explicit,
    });
    if (!resolved.ok) throw new Error(resolved.error);
    patch.phuong_phap_tiet_khuan_chi_dinh = resolved.method;
    // Trigger DB ép phương pháp ưu tiên về mảng cho phép — ghi mảng cùng lúc kẻo bị hoàn lại.
    patch.phuong_phap_cho_phep = [resolved.method];
  }

  if (Object.keys(specsPatch).length) {
    const prev =
      cur.specs && typeof cur.specs === "object" && !Array.isArray(cur.specs)
        ? (cur.specs as Record<string, unknown>)
        : {};
    patch.specs = { ...prev, ...specsPatch };
  }
  const { error } = await supabase.from("cssd_dm_loai_dung_cu").update(patch).eq("id", cur.id);
  if (error) throw new Error(error.message);
  return { loaiId: cur.id, prevIsChiuNhiet, nextIsChiuNhiet };
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

type PreparedBomUpsert = {
  op: "UPSERT";
  idx: number;
  chiTietId: string;
  loaiId: string;
  maLoai: string;
  ten: string;
  soLuong: number;
  maChiTiet: string;
  specsPatch: Record<string, unknown>;
  ghiChu?: string;
};
export type PreparedBomLine = { op: "DELETE"; idx: number; chiTietId: string } | PreparedBomUpsert;

/**
 * Kiểm toàn bộ dòng phiếu BOM TRƯỚC khi ghi (thuần): tên, số lượng ≥ 1, loại, SUDS, trọng lượng,
 * trùng dòng. Các trường chi tiết (`ma_chi_tiet`, `max_suds_count`, `trong_luong`) nằm trong `specs`
 * — bảng `cssd_dm_bo_dung_cu_chi_tiet` không có cột cấp bảng cho chúng.
 */
export function prepareCatalogBomLines(
  lines: CssdCatalogDeNghiBomLine[],
): { ok: true; lines: PreparedBomLine[] } | { ok: false; error: string } {
  if (!lines.length) return { ok: false, error: "Thiếu dòng thành phần." };
  const out: PreparedBomLine[] = [];
  const seenChiTiet = new Set<string>();
  const seenLoai = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const label = `Dòng ${i + 1}`;
    const chiTietId = String(line.chiTietId || "").trim();
    if (chiTietId) {
      if (seenChiTiet.has(chiTietId)) return { ok: false, error: `${label}: trùng dòng thành phần trong phiếu.` };
      seenChiTiet.add(chiTietId);
    }
    if (line.op === "DELETE") {
      if (!chiTietId) return { ok: false, error: `${label}: xóa dòng cần chiTietId.` };
      out.push({ op: "DELETE", idx: i, chiTietId });
      continue;
    }
    if (line.op !== "UPSERT") return { ok: false, error: `${label}: op dòng BOM không hợp lệ.` };
    const ten = String(line.tenDungCuLe || line.tenChiTiet || "").trim();
    if (!ten) return { ok: false, error: `${label}: thiếu tên dụng cụ.` };
    const soLuong = Number(line.soLuong);
    if (!Number.isInteger(soLuong) || soLuong < 1) {
      return { ok: false, error: `${label} (${ten}): số lượng chuẩn phải là số nguyên ≥ 1.` };
    }
    const loaiId = String(line.loaiDungCuId || "").trim();
    const maLoai = String(line.maLoai || "").trim().toUpperCase();
    if (!loaiId && !maLoai) return { ok: false, error: `${label} (${ten}): cần loại dụng cụ.` };
    const loaiKey = loaiId || `MA:${maLoai}`;
    if (seenLoai.has(loaiKey)) {
      return { ok: false, error: `${label} (${ten}): loại dụng cụ lặp trong phiếu — một bộ chỉ một dòng mỗi loại.` };
    }
    seenLoai.add(loaiKey);
    const specsPatch: Record<string, unknown> = {};
    if (line.maxSudsCount != null && String(line.maxSudsCount) !== "") {
      const suds = Number(line.maxSudsCount);
      if (!Number.isInteger(suds) || suds < 1) {
        return { ok: false, error: `${label} (${ten}): số lần tái sử dụng tối đa phải là số nguyên ≥ 1.` };
      }
      specsPatch.max_suds_count = suds;
    }
    if (line.trongLuong != null && String(line.trongLuong).trim() !== "") {
      const tl = Number(String(line.trongLuong).trim().replace(",", "."));
      if (!Number.isFinite(tl) || tl < 0) return { ok: false, error: `${label} (${ten}): trọng lượng không hợp lệ.` };
      specsPatch.trong_luong = tl;
    }
    out.push({
      op: "UPSERT",
      idx: i,
      chiTietId,
      loaiId,
      maLoai,
      ten,
      soLuong,
      maChiTiet: String(line.maChiTiet || "").trim().toUpperCase(),
      specsPatch,
      ...(line.ghiChu != null ? { ghiChu: String(line.ghiChu) } : {}),
    });
  }
  return { ok: true, lines: out };
}

export type BomRowSnapshot = {
  id: string;
  loai_dung_cu_id: string | null;
  is_active: boolean | null;
  specs: unknown;
};

export type CatalogBomWrite =
  | { type: "deactivate"; id: string }
  | { type: "update"; id: string; patch: Record<string, unknown> }
  | { type: "insert"; row: Record<string, unknown> };

/**
 * Lập kế hoạch ghi (thuần) trên ảnh dòng hiện có của bộ. Mô phỏng luật 1 bộ × 1 loại active (D6);
 * vi phạm → lỗi trước khi ghi. Thứ tự ghi: xóa mềm → sửa → thêm.
 */
export function planCatalogBomWrites(
  boId: string,
  prepared: PreparedBomLine[],
  rows: BomRowSnapshot[],
  now: string,
  newMaChiTiet: () => string,
): { ok: true; writes: CatalogBomWrite[] } | { ok: false; error: string } {
  const byId = new Map(rows.map((r) => [String(r.id), r]));
  const activeByLoai = new Map<string, string>();
  for (const r of rows) {
    const loai = String(r.loai_dung_cu_id || "").trim();
    if (r.is_active !== false && loai) activeByLoai.set(loai, String(r.id));
  }
  const deactivate: CatalogBomWrite[] = [];
  const updates: CatalogBomWrite[] = [];
  const inserts: CatalogBomWrite[] = [];
  const touched = new Set<string>();
  const label = (l: PreparedBomLine) => `Dòng ${l.idx + 1}`;

  for (const l of prepared) {
    if (l.op !== "DELETE") continue;
    const row = byId.get(l.chiTietId);
    if (!row) return { ok: false, error: `${label(l)}: dòng cần xóa không thuộc bộ này.` };
    const loai = String(row.loai_dung_cu_id || "").trim();
    if (loai && activeByLoai.get(loai) === l.chiTietId) activeByLoai.delete(loai);
    touched.add(l.chiTietId);
    deactivate.push({ type: "deactivate", id: l.chiTietId });
  }

  for (const l of prepared) {
    if (l.op !== "UPSERT") continue;
    const base: Record<string, unknown> = {
      loai_dung_cu_id: l.loaiId,
      ten_dung_cu_le: l.ten,
      ten_chi_tiet: l.ten,
      so_luong: l.soLuong,
      is_active: true,
      updated_at: now,
    };
    if (l.ghiChu !== undefined) base.ghi_chu = l.ghiChu;
    let targetId = l.chiTietId;
    if (targetId) {
      const row = byId.get(targetId);
      if (!row) return { ok: false, error: `${label(l)} (${l.ten}): dòng cần sửa không thuộc bộ này.` };
      const oldLoai = String(row.loai_dung_cu_id || "").trim();
      if (row.is_active !== false && oldLoai && activeByLoai.get(oldLoai) === targetId) activeByLoai.delete(oldLoai);
    } else {
      targetId = activeByLoai.get(l.loaiId) || "";
    }
    const holder = activeByLoai.get(l.loaiId);
    if (holder && holder !== targetId) {
      return {
        ok: false,
        error: `${label(l)} (${l.ten}): bộ đã có dòng active cùng loại — sửa dòng đó thay vì đổi loại.`,
      };
    }
    if (targetId && touched.has(targetId)) {
      return { ok: false, error: `${label(l)} (${l.ten}): dòng thành phần bị sửa hai lần trong phiếu.` };
    }
    if (targetId) {
      const row = byId.get(targetId)!;
      const prev =
        row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
          ? (row.specs as Record<string, unknown>)
          : {};
      const patch = { ...base };
      if (Object.keys(l.specsPatch).length) patch.specs = { ...prev, ...l.specsPatch };
      touched.add(targetId);
      activeByLoai.set(l.loaiId, targetId);
      updates.push({ type: "update", id: targetId, patch });
    } else {
      activeByLoai.set(l.loaiId, `new:${l.idx}`);
      inserts.push({
        type: "insert",
        row: {
          ...base,
          bo_dung_cu_id: boId,
          specs: { ma_chi_tiet: l.maChiTiet || newMaChiTiet(), ...l.specsPatch },
          created_at: now,
        },
      });
    }
  }
  return { ok: true, writes: [...deactivate, ...updates, ...inserts] };
}

async function applyBom(
  supabase: SupabaseClient,
  targetId: string | null,
  payloadAfter: Record<string, unknown>,
  now: string,
): Promise<void> {
  const boId = String(targetId || "").trim();
  if (!boId) throw new Error("Thiếu bộ đích cho thành phần.");
  const rawLines = Array.isArray(payloadAfter.lines)
    ? (payloadAfter.lines as CssdCatalogDeNghiBomLine[])
    : [];
  const prep = prepareCatalogBomLines(rawLines);
  if (!prep.ok) throw new Error(prep.error);

  // Đọc: giải mã loại → id, rồi kiểm trùng loại sau khi giải.
  const seenResolved = new Set<string>();
  for (const l of prep.lines) {
    if (l.op !== "UPSERT") continue;
    if (!l.loaiId) {
      const { data: loai, error } = await supabase
        .from("cssd_dm_loai_dung_cu")
        .select("id")
        .eq("is_active", true)
        .ilike("ma_loai", l.maLoai.replace(/[%_]/g, ""))
        .limit(2);
      if (error) throw new Error(error.message);
      if (!loai?.length) throw new Error(`Không thấy loại ${l.maLoai}.`);
      if (loai.length > 1) throw new Error(`Mã loại ${l.maLoai} trùng.`);
      l.loaiId = String(loai[0].id);
    }
    if (seenResolved.has(l.loaiId)) {
      throw new Error(`Dòng ${l.idx + 1} (${l.ten}): loại dụng cụ lặp trong phiếu.`);
    }
    seenResolved.add(l.loaiId);
  }

  const ids = prep.lines.map((l) => l.chiTietId).filter(Boolean);
  const { data: activeRows, error: actErr } = await supabase
    .from(BOM_TABLE)
    .select("id, loai_dung_cu_id, is_active, specs")
    .eq("bo_dung_cu_id", boId)
    .eq("is_active", true);
  if (actErr) throw new Error(actErr.message);
  const rows = [...((activeRows || []) as BomRowSnapshot[])];
  const missing = ids.filter((id) => !rows.some((r) => String(r.id) === id));
  if (missing.length) {
    const { data: extra, error } = await supabase
      .from(BOM_TABLE)
      .select("id, loai_dung_cu_id, is_active, specs")
      .eq("bo_dung_cu_id", boId)
      .in("id", missing);
    if (error) throw new Error(error.message);
    rows.push(...((extra || []) as BomRowSnapshot[]));
  }

  const plan = planCatalogBomWrites(boId, prep.lines, rows, now, () =>
    `DC-R${Date.now().toString(36).slice(-6).toUpperCase()}`,
  );
  if (!plan.ok) throw new Error(plan.error);

  // Ghi: chưa nguyên tử (nhiều câu lệnh) — đã kiểm hết trước; RPC transaction ở lát sau (KD-1 RPC).
  for (const w of plan.writes) {
    if (w.type === "deactivate") {
      const { error } = await supabase
        .from(BOM_TABLE)
        .update({ is_active: false, updated_at: now })
        .eq("id", w.id)
        .eq("bo_dung_cu_id", boId);
      if (error) throw new Error(error.message);
    } else if (w.type === "update") {
      const { error } = await supabase.from(BOM_TABLE).update(w.patch).eq("id", w.id).eq("bo_dung_cu_id", boId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from(BOM_TABLE).insert(w.row);
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
): Promise<LoaiHeatChangeFromDeNghi[]> {
  const now = new Date().toISOString();
  const heatChanges: LoaiHeatChangeFromDeNghi[] = [];
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
      else {
        const ch = await applyLoai(supabase, it.targetId || null, String(it.targetMa || ""), it.after, now);
        if (ch) heatChanges.push(ch);
      }
    } else if (it.kind === "BO") {
      if (isCreate) await insertBo(supabase, it.after, now);
      else await applyBo(supabase, it.targetId || null, String(it.targetMa || ""), it.after, now);
    } else {
      // BOM CREATE = UPSERT lines trên bộ đích (đã có); bổ sung dòng mới không có chiTietId.
      await applyBom(supabase, it.targetId || null, it.after, now);
    }
  }
  return heatChanges;
}
