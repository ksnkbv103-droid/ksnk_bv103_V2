"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import {
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "../../danh-muc/actions/master-crud-core";
import { verifyPermission } from "../../actions/verify-permission";
import type { TieuChiBangKiem } from "../bang-kiem.types";

function errBk(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Đọc chuỗi từ payload form (đã normalize client). */
function str(r: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export async function saveBangKiem(data: Record<string, unknown>) {
  try {
    const idRaw = data.id;
    const idEarly = typeof idRaw === "string" ? idRaw : "";
    await verifyPermission("BANG_KIEM", idEarly ? "edit" : "create");
    const payload = {
      ma_bk: str(data, "ma_bk", "ma_bang_kiem"),
      ten_bang_kiem: str(data, "ten_bang_kiem", "ten_bk"),
      mo_ta: (data.mo_ta as string | null | undefined) ?? null,
      phan_loai_chuyen_mon: (data.phan_loai_chuyen_mon as string | null | undefined) ?? null,
      loai_hinh_giam_sat: str(data, "loai_hinh_giam_sat") || "TRUC_TIEP",
      is_active: typeof data.is_active === "boolean" ? data.is_active : true,
      is_system: typeof data.is_system === "boolean" ? data.is_system : false,
      updated_at: new Date().toISOString(),
    };
    const id = typeof idRaw === "string" ? idRaw : "";
    const result = await upsertMasterRow("dm_bang_kiem", id, payload);
    if (!result.success) throw new Error(result.error);
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function deleteBangKiem(id: string) {
  try {
    await verifyPermission("BANG_KIEM", "delete");
    const result = await softDeleteMasterRow("dm_bang_kiem", id);
    if (!result.success) throw new Error(result.error);
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function saveTieuChi(data: Record<string, unknown>) {
  try {
    const idRawEarly = data.id;
    const idEarly = typeof idRawEarly === "string" ? idRawEarly : "";
    await verifyPermission("BANG_KIEM_DETAIL", idEarly ? "edit" : "create");
    
    const bangKiemId =
      (typeof data.bangKiemId === "string" && data.bangKiemId) ||
      (typeof data.bang_kiem_id === "string" && data.bang_kiem_id) ||
      "";
    if (!bangKiemId) {
      throw new Error("Thiếu mã ID bảng kiểm cha.");
    }
    
    const sttRaw = typeof data.stt === "number" ? data.stt : Number(data.stt);
    const stt = Number.isFinite(sttRaw) ? sttRaw : 0;
    const ma_tc = (data.ma_tc as string | null | undefined) ?? null;
    const noi_dung = typeof data.noi_dung === "string" ? data.noi_dung : "";
    const ghi_chu = (data.ghi_chu as string | null | undefined) ?? null;
    const diem_toi_da =
      typeof data.diem_toi_da === "number"
        ? data.diem_toi_da
        : Number(data.diem_toi_da) || 1;
    const is_active = typeof data.is_active === "boolean" ? data.is_active : true;
    
    const supabase = createAdminSupabaseClient();
    const { data: bk, error: fetchErr } = await supabase
      .from("dm_bang_kiem")
      .select("tieu_chi_jsonb")
      .eq("id", bangKiemId)
      .single();
    if (fetchErr || !bk) throw new Error(fetchErr ? fetchErr.message : "Không tìm thấy bảng kiểm.");
    
    const currentArray = Array.isArray(bk.tieu_chi_jsonb)
      ? (bk.tieu_chi_jsonb as TieuChiBangKiem[])
      : [];
      
    if (idEarly) {
      // Edit mode
      const idx = currentArray.findIndex((tc) => tc.id === idEarly);
      if (idx !== -1) {
        currentArray[idx] = {
          ...currentArray[idx],
          stt,
          ma_tc,
          noi_dung,
          ghi_chu,
          diem_toi_da,
          is_active,
          updated_at: new Date().toISOString(),
        };
      } else {
        // ID early specified but not in list, treat as insert with specific ID
        currentArray.push({
          id: idEarly,
          stt,
          ma_tc,
          noi_dung,
          ghi_chu,
          diem_toi_da,
          is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      // Insert mode
      currentArray.push({
        id: crypto.randomUUID(),
        stt: stt || currentArray.length + 1,
        ma_tc,
        noi_dung,
        ghi_chu,
        diem_toi_da,
        is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    // Sort array by stt ascending before saving
    currentArray.sort((a, b) => (a.stt || 0) - (b.stt || 0));
    
    const { error: updateErr } = await supabase
      .from("dm_bang_kiem")
      .update({
        tieu_chi_jsonb: currentArray,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bangKiemId);
    if (updateErr) throw updateErr;
    
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function deleteTieuChi(bangKiemId: string | undefined, tcId: string) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "delete");
    const supabase = createAdminSupabaseClient();
    
    let targetBangKiemId = bangKiemId;
    let currentArray: TieuChiBangKiem[] = [];
    
    if (!targetBangKiemId) {
      const { data: bks, error: findErr } = await supabase
        .from("dm_bang_kiem")
        .select("id, tieu_chi_jsonb")
        .contains("tieu_chi_jsonb", [{ id: tcId }]);
      if (findErr) throw findErr;
      if (!bks || bks.length === 0) {
        throw new Error("Không tìm thấy tiêu chí cần xóa.");
      }
      targetBangKiemId = bks[0].id;
      currentArray = Array.isArray(bks[0].tieu_chi_jsonb)
        ? (bks[0].tieu_chi_jsonb as TieuChiBangKiem[])
        : [];
    } else {
      const { data: bk, error: fetchErr } = await supabase
        .from("dm_bang_kiem")
        .select("tieu_chi_jsonb")
        .eq("id", targetBangKiemId)
        .single();
      if (fetchErr || !bk) throw new Error(fetchErr ? fetchErr.message : "Không tìm thấy bảng kiểm.");
      currentArray = Array.isArray(bk.tieu_chi_jsonb)
        ? (bk.tieu_chi_jsonb as TieuChiBangKiem[])
        : [];
    }
    
    const updatedArray = currentArray.map((tc) => {
      if (tc.id === tcId) {
        return {
          ...tc,
          is_active: false,
          updated_at: new Date().toISOString(),
        };
      }
      return tc;
    });
    
    const { error: updateErr } = await supabase
      .from("dm_bang_kiem")
      .update({
        tieu_chi_jsonb: updatedArray,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetBangKiemId);
    if (updateErr) throw updateErr;
    
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function importTieuChis(bangKiemId: string, newCriteria: Record<string, unknown>[]) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "import");
    const supabase = createAdminSupabaseClient();
    
    const { data: bk, error: fetchErr } = await supabase
      .from("dm_bang_kiem")
      .select("tieu_chi_jsonb")
      .eq("id", bangKiemId)
      .single();
    if (fetchErr || !bk) throw new Error(fetchErr ? fetchErr.message : "Không tìm thấy bảng kiểm.");
    
    const currentArray = Array.isArray(bk.tieu_chi_jsonb)
      ? (bk.tieu_chi_jsonb as TieuChiBangKiem[])
      : [];
      
    const importedPayload = (newCriteria || []).map((nc, index) => {
      const stt = typeof nc.stt === "number" ? nc.stt : Number(nc.stt);
      return {
        id: (typeof nc.id === "string" && nc.id) ? nc.id : crypto.randomUUID(),
        stt: Number.isFinite(stt) ? stt : currentArray.length + index + 1,
        ma_tc: nc.ma_tc as string | undefined,
        noi_dung: typeof nc.noi_dung === "string" ? nc.noi_dung : "",
        ghi_chu: nc.ghi_chu as string | undefined,
        diem_toi_da: typeof nc.diem_toi_da === "number" ? nc.diem_toi_da : Number(nc.diem_toi_da) || 1,
        is_active: typeof nc.is_active === "boolean" ? nc.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    
    const updatedArray = [...currentArray, ...importedPayload];
    updatedArray.sort((a, b) => (a.stt || 0) - (b.stt || 0));
    
    const { error: updateErr } = await supabase
      .from("dm_bang_kiem")
      .update({
        tieu_chi_jsonb: updatedArray,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bangKiemId);
    if (updateErr) throw updateErr;
    
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function deleteMultipleTieuChis(ids: string[]) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "delete");
    if (!ids || ids.length === 0) return { success: true };
    
    const supabase = createAdminSupabaseClient();
    const { data: bks, error: fetchErr } = await supabase
      .from("dm_bang_kiem")
      .select("id, tieu_chi_jsonb");
    if (fetchErr) throw fetchErr;
    if (!bks) return { success: true };
    
    const toDeleteSet = new Set(ids);
    
    for (const bk of bks) {
      const currentArray = Array.isArray(bk.tieu_chi_jsonb)
        ? (bk.tieu_chi_jsonb as TieuChiBangKiem[])
        : [];
      
      let hasChanged = false;
      const updatedArray = currentArray.map((tc) => {
        if (toDeleteSet.has(tc.id) && tc.is_active !== false) {
          hasChanged = true;
          return {
            ...tc,
            is_active: false,
            updated_at: new Date().toISOString(),
          };
        }
        return tc;
      });
      
      if (hasChanged) {
        const { error: updateErr } = await supabase
          .from("dm_bang_kiem")
          .update({
            tieu_chi_jsonb: updatedArray,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bk.id);
        if (updateErr) throw updateErr;
      }
    }
    
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function toggleIsActive(
  table: "dm_bang_kiem" | "tieu_chi_bang_kiem_json",
  id: string,
  currentStatus: boolean,
) {
  try {
    await verifyPermission(table === "dm_bang_kiem" ? "BANG_KIEM" : "BANG_KIEM_DETAIL", "edit");
    const supabase = createAdminSupabaseClient();
    
    if (table === "dm_bang_kiem") {
      const result = await toggleMasterStatus(table, id, currentStatus);
      if (!result.success) throw new Error(result.error);
    } else {
      // Find parent checklist containing this criterion
      const { data: bks, error: findErr } = await supabase
        .from("dm_bang_kiem")
        .select("id, tieu_chi_jsonb")
        .contains("tieu_chi_jsonb", [{ id }]);
      if (findErr) throw findErr;
      if (!bks || bks.length === 0) {
        throw new Error("Không tìm thấy tiêu chí cần kích hoạt/hủy kích hoạt.");
      }
      
      const parentBk = bks[0];
      const currentArray = Array.isArray(parentBk.tieu_chi_jsonb)
        ? (parentBk.tieu_chi_jsonb as TieuChiBangKiem[])
        : [];
        
      const idx = currentArray.findIndex((tc) => tc.id === id);
      if (idx !== -1) {
        currentArray[idx] = {
          ...currentArray[idx],
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        };
        
        const { error: updateErr } = await supabase
          .from("dm_bang_kiem")
          .update({
            tieu_chi_jsonb: currentArray,
            updated_at: new Date().toISOString(),
          })
          .eq("id", parentBk.id);
        if (updateErr) throw updateErr;
      }
    }
    
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function reorderTieuChis(bangKiemId: string) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "edit");
    const supabase = createAdminSupabaseClient();
    
    const { data: bk, error: fetchErr } = await supabase
      .from("dm_bang_kiem")
      .select("tieu_chi_jsonb")
      .eq("id", bangKiemId)
      .single();
    if (fetchErr || !bk) throw new Error(fetchErr ? fetchErr.message : "Không tìm thấy bảng kiểm.");
    
    const currentArray = Array.isArray(bk.tieu_chi_jsonb)
      ? (bk.tieu_chi_jsonb as TieuChiBangKiem[])
      : [];
      
    // Sort array by stt ascending, then created_at ascending
    const sorted = [...currentArray].sort((a, b) => {
      const sttA = typeof a.stt === "number" ? a.stt : 0;
      const sttB = typeof b.stt === "number" ? b.stt : 0;
      if (sttA !== sttB) return sttA - sttB;
      
      const dateA = a.created_at ? new Date(a.created_at as string).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at as string).getTime() : 0;
      return dateA - dateB;
    });
    
    // Assign clean contiguous stt values starting from 1
    const updatedArray = sorted.map((tc, index) => ({
      ...tc,
      stt: index + 1,
      updated_at: new Date().toISOString(),
    }));
    
    const { error: updateErr } = await supabase
      .from("dm_bang_kiem")
      .update({
        tieu_chi_jsonb: updatedArray,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bangKiemId);
    if (updateErr) throw updateErr;
    
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}
