import type { SupabaseClient } from "@supabase/supabase-js";
import { reorderTieuChis } from "./bang-kiem.actions";
import type { NormalizedBangKiemGroup } from "./bang-kiem-import-normalize";
import type { TieuChiBangKiem } from "../bang-kiem.types";

type DbBkRow = { id: string; ma_bk?: string | null; ten_bang_kiem?: string | null; tieu_chi_jsonb?: TieuChiBangKiem[] | null };

export async function syncBangKiemImportToDatabase(
  supabase: SupabaseClient,
  normalizedGroups: NormalizedBangKiemGroup[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: allBKs } = await supabase.from("gstt_dm_bang_kiem").select("ma_bk, ten_bang_kiem, id, tieu_chi_jsonb");
  const bkRows = (allBKs || []) as DbBkRow[];
  const existingBKs = new Map(bkRows.filter((b) => b.ma_bk).map((b) => [String(b.ma_bk), b]));
  const existingBKsByName = new Map(
    bkRows
      .filter((b): b is DbBkRow & { ten_bang_kiem: string } => Boolean(b.ten_bang_kiem))
      .map((b) => [String(b.ten_bang_kiem).trim().toUpperCase(), b]),
  );
  const importedBKCodes = new Set<string>();

  const { data: lastBKs } = await supabase
    .from("gstt_dm_bang_kiem")
    .select("ma_bk")
    .order("ma_bk", { ascending: false })
    .limit(1);
  let bkCounter = lastBKs?.[0]?.ma_bk ? parseInt(lastBKs[0].ma_bk.match(/\d+/)?.[0] || "0") + 1 : 1;

  const dbErrors: string[] = [];
  for (const group of normalizedGroups) {
    const { ma_bk, ten_bang_kiem, phan_loai_chuyen_mon, mo_ta, children } = group;
    let parentId = "";
    let parentRow: DbBkRow | null = null;
    let resolvedMaBK = String(ma_bk || "").trim();
    const normalizedName = String(ten_bang_kiem || "").trim().toUpperCase();
    const parentIsActive = String(group.is_active ?? "true").toLowerCase() !== "false";

    if (normalizedName && existingBKsByName.has(normalizedName)) {
      parentRow = existingBKsByName.get(normalizedName)!;
      parentId = parentRow.id;
      resolvedMaBK = String(parentRow?.ma_bk || "").trim();
      const { error } = await supabase
        .from("gstt_dm_bang_kiem")
        .update({
          ten_bang_kiem,
          phan_loai_chuyen_mon,
          mo_ta,
          is_active: parentIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parentId);
      if (error) dbErrors.push(`BK ${resolvedMaBK || ten_bang_kiem}: ${error.message}`);
    } else if (resolvedMaBK && existingBKs.has(resolvedMaBK)) {
      parentRow = existingBKs.get(resolvedMaBK)!;
      parentId = parentRow.id;
      const { error } = await supabase
        .from("gstt_dm_bang_kiem")
        .update({
          ten_bang_kiem,
          phan_loai_chuyen_mon,
          mo_ta,
          is_active: parentIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parentId);
      if (error) dbErrors.push(`BK ${resolvedMaBK || ten_bang_kiem}: ${error.message}`);
    } else {
      const newMaBK = resolvedMaBK || `BK${(bkCounter++).toString().padStart(3, "0")}`;
      const { data, error } = await supabase
        .from("gstt_dm_bang_kiem")
        .insert([{ ma_bk: newMaBK, ten_bang_kiem, phan_loai_chuyen_mon, mo_ta, is_active: parentIsActive }])
        .select("id")
        .single();
      if (error) dbErrors.push(`BK ${newMaBK || ten_bang_kiem}: ${error.message}`);
      parentId = data?.id;
      resolvedMaBK = newMaBK;
      parentRow = { id: parentId, ma_bk: newMaBK, ten_bang_kiem, tieu_chi_jsonb: [] };
    }
    if (resolvedMaBK) importedBKCodes.add(resolvedMaBK);

    if (parentId && parentRow) {
      const currentTcs = Array.isArray(parentRow.tieu_chi_jsonb) ? [...parentRow.tieu_chi_jsonb] : [];
      const tcCodesInDB = new Set(currentTcs.map((t) => t.ma_tc).filter(Boolean) as string[]);
      const tcByNoiDung = new Map(
        currentTcs
          .map((t) => [String(t.noi_dung ?? "").trim().toUpperCase(), t] as const)
          .filter(([k]) => Boolean(k)),
      );
      const importedTCCodes = new Set<string>();
      
      const newTcArray: TieuChiBangKiem[] = [];

      if (children?.length > 0) {
        for (let idx = 0; idx < children.length; idx++) {
          const child = children[idx] as Record<string, unknown>;
          let maTC = String(child.ma_tc ?? "").trim();
          const noiDung = String(child.noi_dung_tieu_chi ?? child.noi_dung ?? "").trim();
          const ghiChu = String(child.ghi_chu ?? child.ghi_chu_tieu_chi ?? child.ghi_chu_tc ?? "").trim();
          const childIsActive = String(child.is_active ?? "true").toLowerCase() !== "false";
          if (!noiDung) continue;
          
          let existingTcObj = tcByNoiDung.get(noiDung.toUpperCase());
          if (!maTC && existingTcObj?.ma_tc) {
            maTC = existingTcObj.ma_tc;
          }
          
          if (!existingTcObj && maTC) {
             existingTcObj = currentTcs.find(t => t.ma_tc === maTC);
          }

          const stt = idx + 1;
          if (existingTcObj) {
            newTcArray.push({
              ...existingTcObj,
              stt,
              noi_dung: noiDung,
              ghi_chu: ghiChu,
              is_active: childIsActive,
              updated_at: new Date().toISOString(),
            });
            if (existingTcObj.ma_tc) importedTCCodes.add(existingTcObj.ma_tc);
          } else {
             // Create new
            const newMaTC = maTC || `TC-${crypto.randomUUID().substring(0, 8)}`;
            newTcArray.push({
              id: crypto.randomUUID(),
              ma_tc: newMaTC,
              stt,
              noi_dung: noiDung,
              ghi_chu: ghiChu,
              is_active: childIsActive,
              diem_toi_da: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            importedTCCodes.add(newMaTC);
          }
        }
      }

      // Handle soft deletes for missing ones
      for (const oldTc of currentTcs) {
         if (oldTc.ma_tc && !importedTCCodes.has(oldTc.ma_tc)) {
            // It wasn't in the imported children
            // Add it back but mark as inactive
            const alreadyAdded = newTcArray.find(t => t.id === oldTc.id);
            if (!alreadyAdded) {
                newTcArray.push({
                    ...oldTc,
                    is_active: false,
                    updated_at: new Date().toISOString()
                });
            }
         }
      }
      
      // Save new TC array back to DB
      const { error } = await supabase
        .from("gstt_dm_bang_kiem")
        .update({ tieu_chi_jsonb: newTcArray })
        .eq("id", parentId);
        
      if (error) dbErrors.push(`TC update BK ${resolvedMaBK}: ${error.message}`);

      await reorderTieuChis(parentId);
    }
  }

  const bksToDelete = Array.from(existingBKs.keys()).filter((c) => !importedBKCodes.has(c));
  if (bksToDelete.length > 0) {
    const { error } = await supabase
      .from("gstt_dm_bang_kiem")
      .update({ is_active: false })
      .in("ma_bk", bksToDelete);
    if (error) dbErrors.push(`BK delete missing: ${error.message}`);
  }

  if (dbErrors.length > 0) {
    return {
      ok: false,
      error: `Import bảng kiểm lỗi ${dbErrors.length} thao tác DB:\n${dbErrors.slice(0, 10).join("\n")}`,
    };
  }
  return { ok: true };
}
