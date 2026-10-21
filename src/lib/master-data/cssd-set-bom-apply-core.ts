import type { SupabaseClient } from "@supabase/supabase-js";
import {
  doiLoaiIsRelink,
  normalizeMaLoaiDeXuat,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";
import {
  planSetBomWrites,
  prevalidateSetBomLines,
  type SetBomRow,
  type SetBomStep,
} from "@/lib/master-data/cssd-set-bom-plan";

const BOM_TABLE = "cssd_dm_bo_dung_cu_chi_tiet";

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

type LoaiRename = { loaiId: string; ma: string; ten: string; specs: Record<string, unknown> };

/** Đọc + quyết định đích của một dòng DOI_LOAI (chưa ghi gì). */
async function resolveDoiLoaiLine(
  supabase: SupabaseClient,
  line: SetReconcileLineInput,
): Promise<{ step: SetBomStep; rename: LoaiRename | null }> {
  const chiTietId = String(line.chiTietId || "").trim();
  const currentLoaiId = String(line.loaiDungCuId || "").trim();
  const nextMa = normalizeMaLoaiDeXuat(line.maLoaiDeXuat);
  const nextTen = String(line.tenDungCuLeDeXuat || "").trim();
  if (!chiTietId || !currentLoaiId || (!nextMa && !doiLoaiIsRelink(line))) {
    throw new Error(`${line.tenDungCuLe}: thiếu dữ liệu đổi mã loại.`);
  }

  const existingByMa = nextMa ? await findLoaiByMa(supabase, nextMa) : null;
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
  const tenChanged = Boolean(nextTen) && nextTen !== String(target.ten_loai || "").trim();
  const shouldRename =
    Boolean(nextMa) &&
    (nextMa !== targetMa || tenChanged) &&
    String(target.id) === currentLoaiId &&
    !doiLoaiIsRelink(line);

  let rename: LoaiRename | null = null;
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
    rename = { loaiId: String(target.id), ma: nextMa, ten: tenSau, specs: prevSpecs };
  }
  return {
    step: {
      kind: "DOI_LOAI",
      chiTietId,
      currentLoaiId,
      targetLoaiId: String(target.id),
      ten: tenSau,
      label: String(line.tenDungCuLe || "Dòng"),
    },
    rename,
  };
}

/**
 * Áp đề nghị đổi sổ chuẩn sau khi admin duyệt phiếu.
 * KD-1: đọc + kiểm + lập kế hoạch cho TOÀN BỘ dòng trước, chỉ ghi khi hợp lệ; DOI_LOAI sang loại đã có
 * trong bộ → gộp trước (không chạm unique index). Không còn caller: duyệt thật đã chuyển sang RPC `fn_cssd_apply_bom_lines_tx` (nguyên tử); giữ làm đặc tả cho spec.
 */
export async function applyApprovedBomLines(
  supabase: SupabaseClient,
  boDungCuId: string,
  lines: SetReconcileLineInput[],
): Promise<void> {
  const boId = String(boDungCuId || "").trim();
  if (!boId) throw new Error("Thiếu bộ dụng cụ.");
  const invalid = prevalidateSetBomLines(lines);
  if (invalid) throw new Error(invalid);

  const steps: SetBomStep[] = [];
  const renames = new Map<string, LoaiRename>();
  for (const line of lines) {
    const label = String(line.tenDungCuLe || "Dòng");
    if (line.kind === "DOI_CHUAN") {
      steps.push({ kind: "CHUAN", chiTietId: String(line.chiTietId).trim(), soLuong: Math.floor(Number(line.soLuongChuanDeXuat)), label });
    } else if (line.kind === "XOA_DONG") {
      steps.push({ kind: "XOA", chiTietId: String(line.chiTietId).trim(), label });
    } else if (line.kind === "THEM_DONG") {
      steps.push({
        kind: "THEM",
        loaiId: String(line.loaiDungCuId).trim(),
        ten: String(line.tenDungCuLe).trim(),
        soLuong: Math.floor(Number(line.soLuongChuan)),
        label,
      });
    } else if (line.kind === "DOI_LOAI") {
      const { step, rename } = await resolveDoiLoaiLine(supabase, line);
      steps.push(step);
      if (rename) {
        const prev = renames.get(rename.loaiId);
        if (prev && (prev.ma !== rename.ma || prev.ten !== rename.ten)) {
          throw new Error(`${label}: phiếu đổi cùng một loại thành hai mã/tên khác nhau.`);
        }
        renames.set(rename.loaiId, rename);
      }
    }
  }

  const { data: rows, error: rowsErr } = await supabase
    .from(BOM_TABLE)
    .select("id, loai_dung_cu_id, so_luong")
    .eq("bo_dung_cu_id", boId)
    .eq("is_active", true);
  if (rowsErr) throw new Error(rowsErr.message);
  const plan = planSetBomWrites((rows || []) as SetBomRow[], steps);
  if (!plan.ok) throw new Error(plan.error);

  const now = new Date().toISOString();
  for (const w of plan.value) {
    if (w.type === "insert") {
      const { error } = await supabase.from(BOM_TABLE).insert({
        bo_dung_cu_id: boId,
        loai_dung_cu_id: w.loaiId,
        ten_dung_cu_le: w.ten,
        ten_chi_tiet: w.ten,
        so_luong: w.soLuong,
        is_active: true,
        updated_at: now,
        specs: { ma_chi_tiet: newChiTietMa() },
      });
      if (error) throw new Error(error.message);
      continue;
    }
    const patch: Record<string, unknown> =
      w.type === "deactivate" ? { is_active: false } : { ...w.patch };
    if (w.type === "update" && w.patch.ten !== undefined) {
      delete patch.ten;
      patch.ten_dung_cu_le = w.patch.ten;
      patch.ten_chi_tiet = w.patch.ten;
    }
    patch.updated_at = now;
    const { error } = await supabase.from(BOM_TABLE).update(patch).eq("id", w.id).eq("bo_dung_cu_id", boId);
    if (error) throw new Error(error.message);
  }

  // Đổi mã/tên loại toàn cục sau cùng (đã kiểm trùng mã ở bước đọc).
  for (const r of renames.values()) {
    const { error } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .update({
        ma_loai: r.ma,
        ten_loai: r.ten,
        specs: { ...r.specs, ma_loai_dung_cu: r.ma, ten_loai_dung_cu: r.ten },
        updated_at: now,
      })
      .eq("id", r.loaiId);
    if (error) throw new Error(error.message);
  }
}
