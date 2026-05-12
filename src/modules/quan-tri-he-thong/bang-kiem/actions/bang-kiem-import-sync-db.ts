import type { SupabaseClient } from "@supabase/supabase-js";
import { reorderTieuChis } from "./bang-kiem.actions";
import type { NormalizedBangKiemGroup } from "./bang-kiem-import-normalize";

type DbBkRow = { id: string; ma_bk?: string | null; ten_bang_kiem?: string | null };
type DbTcRow = { ma_tc?: string | null; noi_dung?: string | null };

export async function syncBangKiemImportToDatabase(
  supabase: SupabaseClient,
  normalizedGroups: NormalizedBangKiemGroup[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: allBKs } = await supabase.from("dm_bang_kiem").select("ma_bk, ten_bang_kiem, id");
  const bkRows = (allBKs || []) as DbBkRow[];
  const existingBKs = new Map(bkRows.filter((b) => b.ma_bk).map((b) => [String(b.ma_bk), b.id]));
  const existingBKsByName = new Map(
    bkRows
      .filter((b): b is DbBkRow & { ten_bang_kiem: string } => Boolean(b.ten_bang_kiem))
      .map((b) => [String(b.ten_bang_kiem).trim().toUpperCase(), b.id]),
  );
  const importedBKCodes = new Set<string>();

  const { data: lastBKs } = await supabase
    .from("dm_bang_kiem")
    .select("ma_bk")
    .order("ma_bk", { ascending: false })
    .limit(1);
  let bkCounter = lastBKs?.[0]?.ma_bk ? parseInt(lastBKs[0].ma_bk.match(/\d+/)?.[0] || "0") + 1 : 1;
  const { data: lastTCs } = await supabase
    .from("dm_tieu_chi_bang_kiem")
    .select("ma_tc")
    .order("ma_tc", { ascending: false })
    .limit(1);
  let tcCounter = lastTCs?.[0]?.ma_tc ? parseInt(lastTCs[0].ma_tc.match(/\d+/)?.[0] || "0") + 1 : 1;

  const dbErrors: string[] = [];
  for (const group of normalizedGroups) {
    const { ma_bk, ten_bang_kiem, nhom_chuyen_de, mo_ta, children } = group;
    let parentId = "";
    let resolvedMaBK = String(ma_bk || "").trim();
    const normalizedName = String(ten_bang_kiem || "").trim().toUpperCase();
    const parentIsActive = String(group.is_active ?? "true").toLowerCase() !== "false";

    if (normalizedName && existingBKsByName.has(normalizedName)) {
      parentId = existingBKsByName.get(normalizedName)!;
      const { data: existingRow } = await supabase
        .from("dm_bang_kiem")
        .select("ma_bk")
        .eq("id", parentId)
        .single();
      resolvedMaBK = String(existingRow?.ma_bk || "").trim();
      const { error } = await supabase
        .from("dm_bang_kiem")
        .update({
          ten_bang_kiem,
          nhom_chuyen_de,
          mo_ta,
          is_active: parentIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parentId);
      if (error) dbErrors.push(`BK ${resolvedMaBK || ten_bang_kiem}: ${error.message}`);
    } else if (resolvedMaBK && existingBKs.has(resolvedMaBK)) {
      parentId = existingBKs.get(resolvedMaBK)!;
      const { error } = await supabase
        .from("dm_bang_kiem")
        .update({
          ten_bang_kiem,
          nhom_chuyen_de,
          mo_ta,
          is_active: parentIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parentId);
      if (error) dbErrors.push(`BK ${resolvedMaBK || ten_bang_kiem}: ${error.message}`);
    } else {
      const newMaBK = resolvedMaBK || `BK${(bkCounter++).toString().padStart(3, "0")}`;
      const { data, error } = await supabase
        .from("dm_bang_kiem")
        .insert([{ ma_bk: newMaBK, ten_bang_kiem, nhom_chuyen_de, mo_ta, is_active: parentIsActive }])
        .select("id")
        .single();
      if (error) dbErrors.push(`BK ${newMaBK || ten_bang_kiem}: ${error.message}`);
      parentId = data?.id;
      resolvedMaBK = newMaBK;
    }
    if (resolvedMaBK) importedBKCodes.add(resolvedMaBK);

    if (parentId) {
      const { data: existingTCsInDB } = await supabase
        .from("dm_tieu_chi_bang_kiem")
        .select("ma_tc, noi_dung")
        .eq("bang_kiem_id", parentId);
      const tcRows = (existingTCsInDB || []) as DbTcRow[];
      const tcCodesInDB = new Set(tcRows.map((t) => t.ma_tc).filter(Boolean) as string[]);
      const tcByNoiDung = new Map(
        tcRows
          .map((t) => [String(t.noi_dung ?? "").trim().toUpperCase(), t.ma_tc] as const)
          .filter(([k]) => Boolean(k)),
      );
      const importedTCCodes = new Set<string>();

      if (children?.length > 0) {
        for (let idx = 0; idx < children.length; idx++) {
          const child = children[idx] as Record<string, unknown>;
          let maTC = String(child.ma_tc ?? "").trim();
          const noiDung = String(child.noi_dung_tieu_chi ?? child.noi_dung ?? "").trim();
          const ghiChu = String(child.ghi_chu ?? child.ghi_chu_tieu_chi ?? child.ghi_chu_tc ?? "").trim();
          const childIsActive = String(child.is_active ?? "true").toLowerCase() !== "false";
          if (!noiDung) continue;
          if (!maTC) {
            const maybeTc = tcByNoiDung.get(noiDung.toUpperCase());
            if (maybeTc) maTC = String(maybeTc);
          }
          const stt = idx + 1;
          if (maTC && tcCodesInDB.has(maTC)) {
            const { error } = await supabase
              .from("dm_tieu_chi_bang_kiem")
              .update({
                stt,
                noi_dung: noiDung,
                ghi_chu: ghiChu,
                is_active: childIsActive,
                updated_at: new Date().toISOString(),
              })
              .eq("ma_tc", maTC);
            if (error) dbErrors.push(`TC ${maTC} (BK ${resolvedMaBK}): ${error.message}`);
            importedTCCodes.add(maTC);
          } else {
            const newMaTC = maTC || `TC${(tcCounter++).toString().padStart(3, "0")}`;
            const { error } = await supabase.from("dm_tieu_chi_bang_kiem").insert([
              {
                ma_tc: newMaTC,
                bang_kiem_id: parentId,
                stt,
                noi_dung: noiDung,
                ghi_chu: ghiChu,
                is_active: childIsActive,
              },
            ]);
            if (error) dbErrors.push(`TC ${newMaTC} (BK ${resolvedMaBK}): ${error.message}`);
            importedTCCodes.add(newMaTC);
          }
        }
      }

      const tcsToDelete = Array.from(tcCodesInDB).filter((c) => !importedTCCodes.has(c));
      if (tcsToDelete.length > 0) {
        const { error } = await supabase
          .from("dm_tieu_chi_bang_kiem")
          .update({ is_active: false })
          .in("ma_tc", tcsToDelete);
        if (error) dbErrors.push(`TC delete BK ${resolvedMaBK}: ${error.message}`);
      }
      await reorderTieuChis(parentId);
    }
  }

  const bksToDelete = Array.from(existingBKs.keys()).filter((c) => !importedBKCodes.has(c));
  if (bksToDelete.length > 0) {
    const { error } = await supabase
      .from("dm_bang_kiem")
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
