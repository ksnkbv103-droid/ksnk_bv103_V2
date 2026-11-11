/**
 * Đồng bộ tách nhiệt (C′ S3): BOM chỉ nằm trên bộ tổng; bộ con -CN/-KCN do RPC `fn_cssd_dong_bo_tach_nhiet`
 * tạo / kích hoạt lại / vô hiệu và tự tạo quy trình TIEP_NHAN. Không di chuyển dòng BOM.
 * RPC chỉ cấp cho service_role → `supabase` truyền vào PHẢI là admin client (gọi sau khi action đã verifyPermission).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { shouldAutoSplitOnLoaiHeatDowngrade } from "@/lib/domain/cssd-heat-split";

export type HeatSplitApplyResult = {
  split: { maBo: string; maSub: string; movedLines: number }[];
  skipped: { maBo: string; reason: string }[];
};

/** Kết quả đồng bộ kèm lỗi RPC (đã nằm trong `skipped`) để hook ghi log / cảnh báo. */
export type HeatSplitSyncResult = HeatSplitApplyResult & { errors: { maBo: string; message: string }[] };

type RpcChild = { ma_bo?: string };
type RpcResult = { created?: RpcChild[]; reactivated?: RpcChild[]; pending?: RpcChild[] };
type BoRel = { id?: string; is_active?: boolean | null; parent_bo_id?: string | null };

const CHUNK = 100;

function one<T>(rel: T | T[] | null | undefined): T | undefined {
  return Array.isArray(rel) ? rel[0] : (rel ?? undefined);
}

/** Bộ tổng chứa dòng BOM của các loại (dòng nằm trên bộ con → lấy cha), đã khử trùng. */
async function collectBoTongIdsForLoai(supabase: SupabaseClient, loaiIds: string[]): Promise<string[]> {
  const out = new Set<string>();
  for (let i = 0; i < loaiIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("bo_dung_cu_id, bo:cssd_dm_bo_dung_cu!bo_dung_cu_id(id, is_active, parent_bo_id)")
      .in("loai_dung_cu_id", loaiIds.slice(i, i + CHUNK))
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    for (const row of data || []) {
      const bo = one((row as { bo?: BoRel | BoRel[] | null }).bo);
      if (bo?.parent_bo_id) out.add(String(bo.parent_bo_id));
      else if (bo?.id && bo.is_active !== false) out.add(String(bo.id));
    }
  }
  return [...out];
}

/** Gọi RPC đồng bộ tách nhiệt cho từng bộ tổng (khử trùng). Không ném lỗi: lỗi RPC → `skipped` + `errors`. */
export async function syncHeatSplitForBoTong(supabase: SupabaseClient, boIds: string[]): Promise<HeatSplitSyncResult> {
  const out: HeatSplitSyncResult = { split: [], skipped: [], errors: [] };
  const given = [...new Set(boIds.map((x) => String(x || "").trim()).filter(Boolean))];
  if (given.length === 0) return out;
  // Bộ con -> bộ tổng (RPC cũng tự quy về tổng; ở đây khử trùng trước để không gọi lặp).
  const { data: rel } = await supabase.from("cssd_dm_bo_dung_cu").select("id, parent_bo_id").in("id", given);
  const parentOf = new Map((rel || []).map((r) => [String((r as { id: string }).id), (r as { parent_bo_id?: string | null }).parent_bo_id]));
  const ids = [...new Set(given.map((g) => String(parentOf.get(g) || g)))];
  const maById = new Map<string, string>();
  const { data: bos } = await supabase.from("cssd_dm_bo_dung_cu").select("id, ma_bo").in("id", ids);
  for (const b of bos || []) maById.set(String((b as { id: string }).id), normalizeBoMa(String((b as { ma_bo?: string }).ma_bo || "")));

  for (const id of ids) {
    const maBo = maById.get(id) || id;
    const { data, error } = await supabase.rpc("fn_cssd_dong_bo_tach_nhiet", { p_bo_tong_id: id });
    if (error) {
      out.skipped.push({ maBo, reason: `Đồng bộ tách nhiệt lỗi: ${error.message}` });
      out.errors.push({ maBo, message: error.message });
      continue;
    }
    const r = (data || {}) as RpcResult;
    const made = [...(r.created || []), ...(r.reactivated || [])].map((c) => String(c.ma_bo || "")).filter(Boolean);
    if (made.length) out.split.push({ maBo, maSub: made.join("+"), movedLines: 0 });
    const pend = (r.pending || []).map((c) => String(c.ma_bo || "")).filter(Boolean);
    if (pend.length) {
      out.skipped.push({ maBo, reason: `Bộ con ${pend.join(", ")} đang chạy quy trình — giữ lại, đồng bộ khi kết thúc.` });
    }
  }
  return out;
}

/**
 * Hook sau khi ghi dòng BOM (thêm/sửa/xóa/import): đồng bộ bộ con của các bộ liên quan.
 * Lỗi đồng bộ không làm hỏng thao tác chính: log console.error và trả cảnh báo (undefined nếu ổn).
 * `boIds` có thể là bộ con; `lineIds` = dòng chi tiết cần tra bộ chứa.
 */
export async function syncHeatSplitAfterBomWrite(
  supabase: SupabaseClient,
  src: { boIds?: (string | null | undefined)[]; lineIds?: string[] },
  action: string,
): Promise<string | undefined> {
  try {
    const boIds = (src.boIds || []).map((x) => String(x || "").trim()).filter(Boolean);
    const lineIds = (src.lineIds || []).filter(Boolean);
    for (let i = 0; i < lineIds.length; i += CHUNK) {
      const { data, error } = await supabase
        .from("cssd_dm_bo_dung_cu_chi_tiet")
        .select("bo_dung_cu_id")
        .in("id", lineIds.slice(i, i + CHUNK));
      if (error) throw new Error(error.message);
      for (const r of data || []) boIds.push(String((r as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || ""));
    }
    const res = await syncHeatSplitForBoTong(supabase, boIds);
    if (res.errors.length === 0) return undefined;
    await logHeatSplitSyncError(action, res.errors.map((e) => `${e.maBo}: ${e.message}`).join("; "));
    return `Đã lưu nhưng đồng bộ tách nhiệt lỗi (${res.errors.map((e) => e.maBo).join(", ")}).`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await logHeatSplitSyncError(action, msg);
    return `Đã lưu nhưng đồng bộ tách nhiệt lỗi: ${msg}`;
  }
}

async function logHeatSplitSyncError(action: string, error: string): Promise<void> {
  const userId = await getActorNhanSuId().catch(() => null);
  console.error({ module: "CSSD_HEAT_SPLIT", action, userId, error });
}

/** Loại chịu nhiệt → không chịu nhiệt: đồng bộ các bộ tổng chứa loại đó. */
export async function applyHeatSplitAfterLoaiDowngrade(
  supabase: SupabaseClient,
  loaiId: string,
  prevIsChiuNhiet: boolean | null | undefined,
  nextIsChiuNhiet: boolean | null | undefined,
): Promise<HeatSplitApplyResult> {
  if (!shouldAutoSplitOnLoaiHeatDowngrade(prevIsChiuNhiet, nextIsChiuNhiet)) return { split: [], skipped: [] };
  const id = String(loaiId || "").trim();
  if (!id) return { split: [], skipped: [] };
  return syncHeatSplitForBoTong(supabase, await collectBoTongIdsForLoai(supabase, [id]));
}

/** Loại không chịu nhiệt → chịu nhiệt (PO 2026-11-10): đồng bộ lại (bộ con có thể không còn cần). */
export async function applyHeatSplitAfterLoaiUpgrade(
  supabase: SupabaseClient,
  loaiId: string,
  prevIsChiuNhiet: boolean | null | undefined,
  nextIsChiuNhiet: boolean | null | undefined,
): Promise<HeatSplitApplyResult> {
  const id = String(loaiId || "").trim();
  if (prevIsChiuNhiet !== false || nextIsChiuNhiet !== true || !id) return { split: [], skipped: [] };
  return syncHeatSplitForBoTong(supabase, await collectBoTongIdsForLoai(supabase, [id]));
}

/** Quét mọi bộ -KCN đang hoạt động, đồng bộ lại bộ tổng của chúng. */
export async function applyHeatSplitUpgradeForAllKcn(
  supabase: SupabaseClient,
): Promise<{ kcnCount: number; result: HeatSplitApplyResult }> {
  const { data, error } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id, parent_bo_id")
    .eq("vai_tro_tach", "KHONG_CHIU_NHIET")
    .eq("is_active", true)
    .not("parent_bo_id", "is", null);
  if (error) throw new Error(error.message);
  const rows = data || [];
  const parents = rows.map((r) => String((r as { parent_bo_id: string }).parent_bo_id));
  return { kcnCount: rows.length, result: await syncHeatSplitForBoTong(supabase, parents) };
}

export function formatHeatSplitToast(result: HeatSplitApplyResult): string | null {
  if (result.split.length === 0 && result.skipped.length === 0) return null;
  const parts: string[] = [];
  if (result.split.length) {
    parts.push(`Đã đồng bộ tách nhiệt ${result.split.length} bộ: ${result.split.map((s) => `${s.maBo} → ${s.maSub}`).join("; ")}.`);
  }
  if (result.skipped.length) {
    parts.push(`Bỏ qua ${result.skipped.length} bộ: ${result.skipped.map((s) => `${s.maBo} (${s.reason})`).join("; ")}.`);
  }
  return parts.join(" ");
}

export type LoaiHeatChange = {
  loaiId: string;
  prevIsChiuNhiet: boolean | null | undefined;
  nextIsChiuNhiet: boolean | null | undefined;
};

/**
 * KD-2: dùng chung cho form, đề nghị và import — loại đổi nhóm nhiệt thì đồng bộ bộ con của bộ tổng.
 * Trả về các ghi chú (không ném lỗi: loại đã lưu).
 */
export async function applyHeatSplitForLoaiChanges(supabase: SupabaseClient, changes: LoaiHeatChange[]): Promise<string[]> {
  const notes: string[] = [];
  for (const c of changes) {
    try {
      const res = await applyHeatSplitAfterLoaiDowngrade(supabase, c.loaiId, c.prevIsChiuNhiet, c.nextIsChiuNhiet);
      const up = await applyHeatSplitAfterLoaiUpgrade(supabase, c.loaiId, c.prevIsChiuNhiet, c.nextIsChiuNhiet);
      const note = formatHeatSplitToast({ split: [...res.split, ...up.split], skipped: [...res.skipped, ...up.skipped] });
      if (note) notes.push(note);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      notes.push(`Đã lưu loại nhưng tách bộ tự động lỗi: ${msg}`);
    }
  }
  return notes;
}

/** Đồng bộ hàng loạt: mọi bộ tổng chứa loại không chịu nhiệt. */
export async function applyHeatSplitForAllLowHeatLoai(
  supabase: SupabaseClient,
): Promise<{ loaiCount: number; result: HeatSplitApplyResult }> {
  const { data, error } = await supabase.from("cssd_dm_loai_dung_cu").select("id").eq("is_chiu_nhiet", false);
  if (error) throw new Error(error.message);
  const loaiIds = (data || []).map((l) => String((l as { id: string }).id));
  if (loaiIds.length === 0) return { loaiCount: 0, result: { split: [], skipped: [] } };
  const result = await syncHeatSplitForBoTong(supabase, await collectBoTongIdsForLoai(supabase, loaiIds));
  return { loaiCount: loaiIds.length, result };
}
